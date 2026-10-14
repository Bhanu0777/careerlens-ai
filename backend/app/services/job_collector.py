"""
Job Collector Service
Collects job postings from company career pages and job boards.
All collected jobs are stored with provenance tracking (source_name, source_url,
content_hash) and initial verification_status of "needs_verification".
"""
import asyncio
import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.core.database import get_supabase

logger = logging.getLogger(__name__)

# ─── Content hashing ────────────────────────────────────────────────────────────

def compute_content_hash(title: str, company: str, description: str, requirements: List[str]) -> str:
    """Generate a content hash for duplicate detection."""
    content = f"{title}|{company}|{description}|{json.dumps(sorted(requirements), sort_keys=True)}"
    return hashlib.sha256(content.encode()).hexdigest()[:16]


# ─── HTML parsing strategies ────────────────────────────────────────────────────

def _extract_text(soup: BeautifulSoup, css_selector: str, default: str = "") -> str:
    """Extract text from a CSS selector match, with cleanup."""
    el = soup.select_one(css_selector)
    if el:
        text = el.get_text(separator=" ", strip=True)
        return text if text else default
    return default


def _extract_skills(text: str) -> List[str]:
    """Extract likely skill names from job description text using keyword matching.
    Only extracts known skill terms — does NOT hallucinate."""
    known_skills = [
        "Python", "FastAPI", "Flask", "Django", "React", "Node.js", "TypeScript",
        "Machine Learning", "ML", "Deep Learning", "LLM", "LLMs", "Large Language Models",
        "RAG", "NLP", "PyTorch", "TensorFlow", "scikit-learn", "SQL", "PostgreSQL",
        "MongoDB", "Docker", "Kubernetes", "AWS", "GCP", "Azure", "CI/CD", "Git",
        "Java", "C++", "Go", "Rust", "Scala", "Spark", "Kafka", "Redis", "Linux",
        "REST API", "GraphQL", "LangChain", "Hugging Face", "MLOps", "Pandas", "NumPy",
        "Tableau", "Power BI", "Snowflake", "Airflow", "Celery", "RabbitMQ",
        "Computer Vision", "Transformers", "OpenAI", "Gemini", "Prompt Engineering",
    ]
    found = []
    lowered = text.lower()
    for skill in known_skills:
        if skill.lower() in lowered:
            found.append(skill)
    # Deduplicate preserving order
    seen = set()
    result = []
    for s in found:
        if s.lower() not in seen:
            seen.add(s.lower())
            result.append(s)
    return result


def parse_job_page(html: str, url: str) -> Optional[Dict[str, Any]]:
    """Parse a single job page and extract structured data.
    Returns None if the page doesn't contain recognizable job listing data."""
    soup = BeautifulSoup(html, "html.parser")

    # Try multiple common job title selectors
    title = (
        _extract_text(soup, "h1.job-title")
        or _extract_text(soup, "h1")
        or _extract_text(soup, "[data-automation='jobTitle']")
        or _extract_text(soup, ".job-title")
        or _extract_text(soup, "title")
    )

    if not title or len(title) < 3:
        return None

    # Company — try common patterns
    company = (
        _extract_text(soup, "[data-company]")
        or _extract_text(soup, ".company-name")
        or _extract_text(soup, ".employer")
        or _extract_text(soup, "[data-automation='company']")
        or _extract_text(soup, "a[data-company]")
    )

    # Location
    location = (
        _extract_text(soup, "[data-location]")
        or _extract_text(soup, ".location")
        or _extract_text(soup, "[data-automation='location']")
        or _extract_text(soup, ".job-location")
    )

    # Work mode
    work_mode = ""
    for wm in ["remote", "hybrid", "onsite", "on-site"]:
        if wm in title.lower() or wm in (location or "").lower() or wm in html.lower():
            work_mode = wm.capitalize() if wm != "on-site" else "Onsite"
            break

    # Description
    description = (
        _extract_text(soup, "[data-description]")
        or _extract_text(soup, ".job-description")
        or _extract_text(soup, ".description")
        or _extract_text(soup, "article")
        or _extract_text(soup, "main")
    )

    # Requirements — try to find a requirements list
    requirements = _extract_skills(description) if description else []

    # Apply URL
    apply_url = (
        soup.select_one("a.apply-link, a[data-apply], .apply-button a")
        or soup.select_one("a[href*='apply']")
    )
    if apply_url:
        apply_url = urljoin(url, apply_url.get("href", ""))
    else:
        apply_url = url

    # Posted date — try to extract
    posted_date = ""
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', html)
    if date_match:
        posted_date = date_match.group(1)

    parsed = {
        "title": title,
        "company": company or "Unknown",
        "location": location or "Not specified",
        "work_mode": work_mode or "Not specified",
        "description": description[:2000] if description else "",
        "requirements": requirements,
        "apply_url": apply_url,
        "posted_date": posted_date,
        "source_url": url,
    }

    if not parsed["title"]:
        return None

    return parsed


def parse_job_listing_page(html: str, base_url: str) -> List[str]:
    """Parse a job listing/search page and return individual job page URLs."""
    soup = BeautifulSoup(html, "html.parser")
    job_urls = []

    # Common job link selectors
    link_selectors = [
        "a[data-job-url]",
        "a.job-link",
        "a[data-automation='jobLink']",
        ".job-listing a[href]",
        ".job-results a[href]",
        "a[href*='/job/']",
        "a[href*='/careers/job/']",
        "a[href*='/positions/']",
        "a[href*='/opening/']",
    ]

    for selector in link_selectors:
        for link in soup.select(selector):
            href = link.get("href", "")
            if href and len(href) > 10:
                full_url = urljoin(base_url, href)
                if full_url not in job_urls:
                    job_urls.append(full_url)

    return job_urls[:50]  # Cap at 50 jobs per page


# ─── Supabase operations ─────────────────────────────────────────────────────────

def _job_exists_by_hash(db, content_hash: str) -> Optional[str]:
    """Check if a job with the same content_hash already exists. Returns job id if found."""
    try:
        resp = db.table("jobs").select("id").eq("content_hash", content_hash).execute()
        if resp.data:
            return resp.data[0]["id"]
    except Exception as e:
        logger.warning(f"Error checking for existing job by hash: {e}")
    return None


def _save_job(db, job_data: Dict[str, Any]) -> Optional[str]:
    """Insert or update a job in the database. Returns job id."""
    content_hash = compute_content_hash(
        job_data["title"],
        job_data["company"],
        job_data["description"],
        job_data.get("requirements", []),
    )

    existing_id = _job_exists_by_hash(db, content_hash)

    job_record = {
        "title": job_data["title"],
        "company": job_data["company"],
        "location": job_data["location"],
        "description": job_data["description"],
        "requirements": json.dumps(job_data.get("requirements", [])),
        "apply_url": job_data["apply_url"],
        "work_mode": job_data["work_mode"],
        "posted_date": job_data.get("posted_date") or datetime.now(timezone.utc).isoformat(),
        "status": "active",
        "source": job_data.get("source_name", job_data["source_url"]),
        "source_name": job_data.get("source_name", ""),
        "source_url": job_data["source_url"],
        "content_hash": content_hash,
        "verification_status": "needs_verification",
        "first_seen_at": datetime.now(timezone.utc).isoformat(),
        "last_verified_at": datetime.now(timezone.utc).isoformat(),
        "verification_notes": "Auto-collected - pending manual verification",
    }

    try:
        if existing_id:
            # Update existing job's verification timestamp
            db.table("jobs").update({
                "last_verified_at": datetime.now(timezone.utc).isoformat(),
                "description": job_record["description"],
                "requirements": job_record["requirements"],
            }).eq("id", existing_id).execute()
            logger.info(f"Updated existing job: {job_data['title']} at {job_data['company']}")
            return existing_id
        else:
            resp = db.table("jobs").insert(job_record).execute()
            if resp.data:
                logger.info(f"Collected new job: {job_data['title']} at {job_data['company']}")
                return resp.data[0]["id"]
    except Exception as e:
        logger.error(f"Failed to save job {job_data['title']}: {e}")
        return None

    return None


def _log_collection(db, log_entry: Dict[str, Any]) -> None:
    """Log a collection run to the data_collection_log table."""
    try:
        db.table("data_collection_log").insert(log_entry).execute()
    except Exception as e:
        logger.error(f"Failed to write collection log: {e}")


# ─── Main collection function ───────────────────────────────────────────────────

async def collect_jobs_from_source(
    source_url: str,
    source_name: str,
    query_params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Collect job postings from a single source URL.
    
    Supports two modes:
    - Direct job page URL: parses the page for a single job
    - Listing/search page: discovers job links, fetches each
    
    Returns summary dict with counts and log entry.
    """
    db = get_supabase()
    started_at = datetime.now(timezone.utc)

    result = {
        "source": source_name,
        "source_url": source_url,
        "query_params": json.dumps(query_params or {}),
        "jobs_found": 0,
        "jobs_new": 0,
        "jobs_updated": 0,
        "jobs_failed": 0,
        "status": "running",
        "started_at": started_at.isoformat(),
    }

    # Log start
    _log_collection(db, {**result, "started_at": started_at.isoformat()})

    job_urls: List[str] = []
    jobs_found = 0

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            follow_redirects=True,
            headers={
                "User-Agent": "CareerLens-AI-JobCollector/1.0 (contact@careerlens.ai)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        ) as client:
            # Fetch the source page
            try:
                resp = await client.get(source_url)
                resp.raise_for_status()
            except Exception as e:
                logger.error(f"Failed to fetch source {source_url}: {e}")
                result["jobs_found"] = 0
                result["status"] = "failed"
                result["error_message"] = str(e)
                _log_collection(db, {
                    **result,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                })
                return result

            html = resp.text

            # Determine if this is a listing page or single job page
            soup = BeautifulSoup(html, "html.parser")

            # Check if page contains job listing links
            listing_links = soup.select("a[href*='/job/'], a[href*='/careers/job/'], a[href*='/opening/'], a.job-link")

            if listing_links:
                # Listing page — discover job URLs
                job_urls = parse_job_listing_page(html, source_url)
                result["jobs_found"] = len(job_urls)
                logger.info(f"Found {len(job_urls)} job links on listing page")
            else:
                # Single job page
                job_urls = [source_url]
                result["jobs_found"] = 1

            # Fetch and parse each job page
            async def fetch_and_parse(url: str) -> Optional[Dict[str, Any]]:
                try:
                    job_resp = await client.get(url, timeout=15.0)
                    if job_resp.status_code == 200:
                        parsed = parse_job_page(job_resp.text, url)
                        if parsed:
                            parsed["source_name"] = source_name
                            return parsed
                except Exception as e:
                    logger.warning(f"Failed to fetch job page {url}: {e}")
                return None

            # Process up to 50 job URLs concurrently with semaphore
            sem = asyncio.Semaphore(5)

            async def bounded_fetch(url: str) -> Optional[Dict[str, Any]]:
                async with sem:
                    return await fetch_and_parse(url)

            tasks = [bounded_fetch(url) for url in job_urls]
            parsed_jobs = await asyncio.gather(*tasks)

            # Save to database
            for parsed in parsed_jobs:
                if not parsed:
                    result["jobs_failed"] += 1
                    continue

                job_id = _save_job(db, parsed)
                if job_id:
                    # _save_job returns existing_id if updated, new id if new
                    # We check if it was an update by comparing
                    if _job_exists_by_hash(db, compute_content_hash(
                        parsed["title"], parsed["company"],
                        parsed["description"], parsed.get("requirements", [])
                    )) == job_id:
                        result["jobs_new"] += 1
                    else:
                        result["jobs_updated"] += 1
                else:
                    result["jobs_failed"] += 1

    except Exception as e:
        logger.error(f"Job collection failed for {source_url}: {e}")
        result["status"] = "failed"
        result["error_message"] = str(e)
        result["jobs_failed"] = len(job_urls) - result["jobs_new"] - result["jobs_updated"]
    else:
        result["status"] = "completed"

    result["completed_at"] = datetime.now(timezone.utc).isoformat()
    _log_collection(db, result)

    logger.info(
        f"Collection complete for {source_name}: "
        f"{result['jobs_found']} found, {result['jobs_new']} new, "
        f"{result['jobs_updated']} updated, {result['jobs_failed']} failed"
    )

    return result


async def collect_jobs_batch(sources: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """Collect jobs from multiple sources concurrently."""
    tasks = [
        collect_jobs_from_source(
            source_url=s["url"],
            source_name=s.get("name", s["url"]),
            query_params=s.get("params"),
        )
        for s in sources
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r if not isinstance(r, Exception) else {"error": str(r)} for r in results]
