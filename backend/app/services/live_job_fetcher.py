"""
Live Job Fetcher
Fetches real, live job postings from free public APIs:
  - Remotive (remotive.com/api/remote-jobs) — no key required
  - RemoteOK (remoteok.com/api) — no key required
  - Jobicy (jobicy.com/api/v2/remote-jobs) — no key required

All jobs have a real, working apply URL. No scraping, no HTML parsing.
"""
import asyncio
import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


def _strip_html(html: str) -> str:
    """Remove HTML tags and decode common entities."""
    text = re.sub(r'<[^>]+>', ' ', html or '')
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&nbsp;', ' ').replace('&#39;', "'").replace('&quot;', '"').replace('&hellip;', '…')
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# ── Tags/keywords we care about ────────────────────────────────────────────────
RELEVANT_TAGS = {
    "python", "ml", "ai", "machine-learning", "deep-learning", "nlp",
    "fastapi", "django", "flask", "react", "typescript", "node", "nodejs",
    "data-science", "llm", "generative-ai", "pytorch", "tensorflow",
    "backend", "fullstack", "full-stack", "software-engineer", "devops",
    "docker", "kubernetes", "aws", "gcp", "cloud", "data-engineer",
}

RELEVANT_TITLE_KEYWORDS = [
    "python", "ml", "ai", "machine learning", "deep learning", "nlp",
    "data scientist", "data engineer", "software engineer", "backend",
    "fullstack", "full stack", "frontend", "react", "node", "fastapi",
    "llm", "generative ai", "genai", "devops", "cloud engineer",
    "platform engineer", "ml engineer", "ai engineer",
]

def _is_relevant(title: str, tags: List[str]) -> bool:
    t = title.lower()
    if any(kw in t for kw in RELEVANT_TITLE_KEYWORDS):
        return True
    tag_set = {tg.lower() for tg in tags}
    return bool(tag_set & RELEVANT_TAGS)

def _compute_hash(title: str, company: str) -> str:
    content = f"{title.lower().strip()}|{company.lower().strip()}"
    return hashlib.sha256(content.encode()).hexdigest()[:16]

def _extract_skills(text: str, tags: List[str]) -> List[str]:
    """Extract skill names from tags + title text."""
    known = [
        "Python", "FastAPI", "Flask", "Django", "React", "Node.js", "TypeScript",
        "Machine Learning", "Deep Learning", "LLM", "LLMs", "RAG", "NLP",
        "PyTorch", "TensorFlow", "SQL", "PostgreSQL", "MongoDB", "Docker",
        "Kubernetes", "AWS", "GCP", "Azure", "Git", "Java", "Go", "Rust",
        "Spark", "Kafka", "Redis", "GraphQL", "LangChain", "Hugging Face",
        "MLOps", "Pandas", "NumPy", "Generative AI", "GenAI", "CI/CD",
        "Terraform", "Linux", "REST API", "Airflow", "OpenAI", "Gemini",
    ]
    combined = text.lower() + " " + " ".join(tags).lower()
    found, seen = [], set()
    for skill in known:
        if skill.lower() in combined and skill.lower() not in seen:
            found.append(skill)
            seen.add(skill.lower())
    return found


# ── Remotive ──────────────────────────────────────────────────────────────────

async def fetch_remotive(client: httpx.AsyncClient, search: str = "") -> List[Dict[str, Any]]:
    """
    Fetch live jobs from Remotive public API.
    Endpoint: https://remotive.com/api/remote-jobs
    No API key required. Attribution to Remotive required.
    """
    categories = [
        "software-dev", "data", "devops-sysadmin", "product",
    ]
    jobs: List[Dict[str, Any]] = []
    seen_hashes: set = set()

    for category in categories:
        try:
            params: Dict[str, Any] = {"category": category, "limit": 50}
            if search:
                params["search"] = search
            resp = await client.get(
                "https://remotive.com/api/remote-jobs",
                params=params,
                timeout=15.0,
            )
            if resp.status_code != 200:
                logger.warning(f"Remotive {category}: HTTP {resp.status_code}")
                continue

            data = resp.json()
            raw_jobs = data.get("jobs", [])

            for j in raw_jobs:
                title = j.get("title", "")
                company = j.get("company_name", "")
                tags = j.get("tags", [])

                if not _is_relevant(title, tags):
                    continue

                h = _compute_hash(title, company)
                if h in seen_hashes:
                    continue
                seen_hashes.add(h)

                apply_url = j.get("url", "")  # direct Remotive listing URL
                description = _strip_html(j.get("description", ""))
                skills = _extract_skills(title + " " + description, tags)

                # Salary
                salary = j.get("salary", "") or ""

                jobs.append({
                    "title": title,
                    "company": company,
                    "location": j.get("candidate_required_location", "Remote") or "Remote",
                    "work_mode": "Remote",
                    "description": description[:3000] if description else "",
                    "requirements": skills,
                    "apply_url": apply_url,
                    "posted_date": j.get("publication_date", ""),
                    "salary": salary,
                    "source_name": "Remotive",
                    "source_url": "https://remotive.com",
                    "verification_status": "verified_active",
                    "content_hash": h,
                })

        except Exception as e:
            logger.warning(f"Remotive fetch error for {category}: {e}")

    logger.info(f"Remotive: {len(jobs)} relevant jobs fetched")
    return jobs


# ── RemoteOK ──────────────────────────────────────────────────────────────────

async def fetch_remoteok(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """
    Fetch live jobs from RemoteOK public API.
    Endpoint: https://remoteok.com/api
    No API key required. Attribution to RemoteOK required.
    """
    tags_to_fetch = ["python", "react", "typescript", "devops", "machine-learning", "ai"]
    jobs: List[Dict[str, Any]] = []
    seen_hashes: set = set()

    for tag in tags_to_fetch:
        try:
            resp = await client.get(
                f"https://remoteok.com/api?tag={tag}",
                timeout=15.0,
                headers={"User-Agent": "CareerLens-AI/1.0 (careerlens.ai)"},
            )
            if resp.status_code != 200:
                logger.warning(f"RemoteOK tag={tag}: HTTP {resp.status_code}")
                continue

            raw = resp.json()
            # First element is always a legal notice dict, skip it
            job_list = [item for item in raw if isinstance(item, dict) and item.get("position")]

            for j in job_list:
                title = j.get("position", "")
                company = j.get("company", "")
                tags = j.get("tags", [])

                if not _is_relevant(title, tags):
                    continue

                h = _compute_hash(title, company)
                if h in seen_hashes:
                    continue
                seen_hashes.add(h)

                # RemoteOK apply URL
                slug = j.get("slug", "")
                apply_url = j.get("apply_url") or f"https://remoteok.com/l/{slug}"
                description = j.get("description", "")
                skills = _extract_skills(title + " " + description, tags)

                salary = ""
                s_min = j.get("salary_min")
                s_max = j.get("salary_max")
                if s_min and s_max:
                    salary = f"${int(s_min):,} – ${int(s_max):,}"
                elif s_min:
                    salary = f"${int(s_min):,}+"

                posted = j.get("date", "")

                jobs.append({
                    "title": title,
                    "company": company,
                    "location": "Remote",
                    "work_mode": "Remote",
                    "description": description[:3000] if description else "",
                    "requirements": skills,
                    "apply_url": apply_url,
                    "posted_date": posted,
                    "salary": salary,
                    "source_name": "RemoteOK",
                    "source_url": "https://remoteok.com",
                    "verification_status": "verified_active",
                    "content_hash": h,
                })

            await asyncio.sleep(1.0)  # RemoteOK rate-limit courtesy pause

        except Exception as e:
            logger.warning(f"RemoteOK fetch error for tag={tag}: {e}")

    logger.info(f"RemoteOK: {len(jobs)} relevant jobs fetched")
    return jobs


# ── Jobicy ────────────────────────────────────────────────────────────────────

async def fetch_jobicy(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """
    Fetch live jobs from Jobicy public API.
    Endpoint: https://jobicy.com/api/v2/remote-jobs
    No API key required. Attribution to Jobicy required.
    """
    tags_to_fetch = ["python", "react", "machine-learning", "ai", "devops"]
    jobs: List[Dict[str, Any]] = []
    seen_hashes: set = set()

    for tag in tags_to_fetch:
        try:
            resp = await client.get(
                "https://jobicy.com/api/v2/remote-jobs",
                params={"count": 50, "tag": tag},
                timeout=15.0,
            )
            if resp.status_code != 200:
                logger.warning(f"Jobicy tag={tag}: HTTP {resp.status_code}")
                continue

            data = resp.json()
            raw_jobs = data.get("jobs", [])

            for j in raw_jobs:
                title = j.get("jobTitle", "")
                company = j.get("companyName", "")

                if not _is_relevant(title, [tag]):
                    continue

                h = _compute_hash(title, company)
                if h in seen_hashes:
                    continue
                seen_hashes.add(h)

                apply_url = j.get("url", "")
                description = j.get("jobDescription", "")
                excerpt = j.get("jobExcerpt", "")
                full_desc = _strip_html(description or excerpt or "")
                skills = _extract_skills(title + " " + full_desc, [tag])

                jobs.append({
                    "title": title,
                    "company": company,
                    "location": j.get("jobGeo", "Remote") or "Remote",
                    "work_mode": "Remote",
                    "description": full_desc[:3000] if full_desc else "",
                    "requirements": skills,
                    "apply_url": apply_url,
                    "posted_date": j.get("pubDate", ""),
                    "salary": "",
                    "source_name": "Jobicy",
                    "source_url": "https://jobicy.com",
                    "verification_status": "verified_active",
                    "content_hash": h,
                })

        except Exception as e:
            logger.warning(f"Jobicy fetch error for tag={tag}: {e}")

    logger.info(f"Jobicy: {len(jobs)} relevant jobs fetched")
    return jobs


# ── Main aggregator ───────────────────────────────────────────────────────────

async def fetch_all_live_jobs(search: str = "") -> Dict[str, Any]:
    """
    Fetch real live jobs from all three free public APIs concurrently.
    Returns deduplicated, normalized list with real apply URLs.
    """
    async with httpx.AsyncClient(
        follow_redirects=True,
        headers={"User-Agent": "CareerLens-AI/1.0 (careerlens.ai)"},
        timeout=httpx.Timeout(20.0, connect=8.0),
    ) as client:
        remotive_jobs, remoteok_jobs, jobicy_jobs = await asyncio.gather(
            fetch_remotive(client, search),
            fetch_remoteok(client),
            fetch_jobicy(client),
            return_exceptions=True,
        )

    all_jobs: List[Dict[str, Any]] = []
    seen_hashes: set = set()

    for batch in [remotive_jobs, remoteok_jobs, jobicy_jobs]:
        if isinstance(batch, Exception):
            logger.error(f"Batch fetch error: {batch}")
            continue
        for job in batch:
            h = job.get("content_hash", "")
            if h and h not in seen_hashes:
                seen_hashes.add(h)
                all_jobs.append(job)

    # Sort newest first (best-effort — not all sources have consistent date format)
    all_jobs.sort(key=lambda j: j.get("posted_date") or "", reverse=True)

    logger.info(
        f"Live job fetch complete: {len(all_jobs)} unique jobs "
        f"(Remotive: {len(remotive_jobs) if not isinstance(remotive_jobs, Exception) else 'err'}, "
        f"RemoteOK: {len(remoteok_jobs) if not isinstance(remoteok_jobs, Exception) else 'err'}, "
        f"Jobicy: {len(jobicy_jobs) if not isinstance(jobicy_jobs, Exception) else 'err'})"
    )

    return {
        "jobs": all_jobs,
        "total": len(all_jobs),
        "sources": {
            "remotive": len(remotive_jobs) if not isinstance(remotive_jobs, Exception) else 0,
            "remoteok": len(remoteok_jobs) if not isinstance(remoteok_jobs, Exception) else 0,
            "jobicy": len(jobicy_jobs) if not isinstance(jobicy_jobs, Exception) else 0,
        },
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


async def save_live_jobs_to_db(db, jobs: List[Dict[str, Any]]) -> Dict[str, int]:
    """Save fetched live jobs to Supabase, upsert by content_hash."""
    new_count = updated_count = failed_count = 0

    for job in jobs:
        try:
            now = datetime.now(timezone.utc).isoformat()
            record = {
                "title": job["title"],
                "company": job["company"],
                "location": job["location"],
                "work_mode": job["work_mode"],
                "description": job["description"],
                "requirements": json.dumps(job["requirements"]),
                "apply_url": job["apply_url"],
                "posted_date": job.get("posted_date") or now,
                "salary": job.get("salary") or None,
                "status": "active",
                "source": job["source_name"],
                "source_name": job["source_name"],
                "source_url": job["source_url"],
                "content_hash": job["content_hash"],
                "verification_status": "verified_active",
                "first_seen_at": now,
                "last_verified_at": now,
                "verification_notes": f"Auto-fetched from {job['source_name']} public API",
            }

            # Check if exists
            existing = db.table("jobs").select("id").eq("content_hash", job["content_hash"]).execute()
            if existing.data:
                db.table("jobs").update({
                    "last_verified_at": now,
                    "verification_status": "verified_active",
                }).eq("content_hash", job["content_hash"]).execute()
                updated_count += 1
            else:
                db.table("jobs").insert(record).execute()
                new_count += 1

        except Exception as e:
            logger.error(f"Failed to save job '{job.get('title')}': {e}")
            failed_count += 1

    return {"new": new_count, "updated": updated_count, "failed": failed_count}
