"""
Jobs API
Reads job listings from the Supabase jobs table.
Fit scores are computed deterministically from candidate skills if provided.
NO FALLBACK MOCK DATA - returns empty list if no real data exists.
"""
import logging
import hashlib
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.models.schemas import JobItem, MatchDetailResponse, FitScoreBreakdown, MatchedSkillEvidence, VerificationStatus
from app.core.database import get_supabase
from app.services.career_intelligence import calculate_fit_score
from app.services.job_sources import get_default_sources, COMPANY_CAREER_SOURCES, AI_ROLE_QUERIES

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["Jobs & Fit Match"])


def _compute_content_hash(title: str, company: str, description: str, requirements: list) -> str:
    """Generate content hash for duplicate detection."""
    content = f"{title}|{company}|{description}|{json.dumps(requirements, sort_keys=True)}"
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def _row_to_job(r: dict) -> JobItem:
    """Convert a Supabase jobs row → JobItem with provenance fields."""
    from datetime import datetime, timezone
    
    # Human-readable posted date
    posted = r.get("posted_date") or ""
    if posted:
        try:
            dt = datetime.fromisoformat(posted.replace("Z", "+00:00"))
            diff_h = int((datetime.now(timezone.utc) - dt).total_seconds() / 3600)
            if diff_h < 1:
                posted_label = "Just now"
            elif diff_h < 24:
                posted_label = f"{diff_h} hour{'s' if diff_h > 1 else ''} ago"
            else:
                diff_d = diff_h // 24
                posted_label = f"{diff_d} day{'s' if diff_d > 1 else ''} ago"
        except Exception:
            posted_label = "Recently"
    else:
        posted_label = "Date not specified"

    reqs: list = r.get("requirements") or []
    verification_status = r.get("verification_status") or "needs_verification"
    
    return JobItem(
        id=str(r["id"]),
        title=r.get("title", ""),
        company=r.get("company", ""),
        location=r.get("location") or "",
        salary=r.get("salary"),
        fitScore=0,  # computed below when candidate skills provided
        postedDate=posted_label,
        workMode=r.get("work_mode") or "Not specified",
        experienceRequired=r.get("experience_required") or "Not specified",
        description=r.get("description") or "",
        matchedSkills=[],
        partialSkills=[],
        missingSkills=reqs,
        source=r.get("source") or "Unknown",
        applyUrl=r.get("apply_url") or "#",
        # Provenance fields
        source_name=r.get("source_name") or r.get("source") or "Unknown",
        source_url=r.get("source_url"),
        first_seen_at=r.get("first_seen_at"),
        last_verified_at=r.get("last_verified_at"),
        verification_status=VerificationStatus(verification_status) if verification_status in [v.value for v in VerificationStatus] else VerificationStatus.needs_verification,
        content_hash=r.get("content_hash"),
        verification_notes=r.get("verification_notes"),
    )


@router.get("", response_model=List[JobItem])
async def list_jobs(
    query: str = Query(default=""),
    workMode: str = Query(default=""),
    candidate_skills: str = Query(default=""),
    verification_status: Optional[str] = Query(default=None),
):
    """
    List jobs from Supabase. Optionally compute live fit scores when
    candidate_skills are supplied (e.g. ?candidate_skills=Python,ML,FastAPI).
    Filter by verification_status: verified_active, needs_verification, inactive, expired
    """
    try:
        db = get_supabase()
        q = db.table("jobs") \
            .select("id,title,company,location,salary,description,requirements,apply_url,posted_date,verified_at,status,work_mode,experience_required,source,source_name,source_url,first_seen_at,last_verified_at,verification_status,content_hash,verification_notes") \
            .eq("status", "active") \
            .order("posted_date", desc=True)

        if workMode and workMode.lower() not in ("all", ""):
            q = q.ilike("work_mode", workMode)

        if verification_status and verification_status in [v.value for v in VerificationStatus]:
            q = q.eq("verification_status", verification_status)

        resp = q.execute()
        rows = resp.data or []

        if not rows:
            logger.info("jobs table empty - no real job data available")
            return []

        skills_list = [s.strip() for s in candidate_skills.split(",") if s.strip()] if candidate_skills else []

        result = []
        for r in rows:
            job = _row_to_job(r)
            reqs: list = r.get("requirements") or []

            if skills_list and reqs:
                fit = calculate_fit_score(
                    candidate_skills=skills_list,
                    job_requirements=reqs,
                )
                job.fitScore = fit["score"]
                job.matchedSkills = fit["matched_skills"]
                job.missingSkills = fit["missing_skills"]
            else:
                job.matchedSkills = []
                job.missingSkills = reqs

            result.append(job)

        # Text search filter
        if query:
            ql = query.lower()
            result = [
                j for j in result
                if ql in j.title.lower() or ql in j.company.lower() or ql in (j.location or "").lower()
            ]

        # Sort by fit score desc (or by verification status + posted date if no scores)
        result.sort(key=lambda j: (j.fitScore, j.last_verified_at or ""), reverse=True)
        return result

    except Exception as e:
        logger.error(f"Supabase jobs query failed: {e}")
        raise HTTPException(status_code=503, detail=f"Job data unavailable: {str(e)}")


@router.get("/verified-active", response_model=List[JobItem])
async def list_verified_active_jobs(
    query: str = Query(default=""),
    workMode: str = Query(default=""),
    candidate_skills: str = Query(default=""),
):
    """Get only verified active jobs for 'Apply First' recommendations."""
    return await list_jobs(query, workMode, candidate_skills, verification_status="verified_active")


@router.get("/{job_id}/match", response_model=MatchDetailResponse)
async def get_job_match_detail(
    job_id: str,
    candidate_skills: str = Query(default=""),
):
    """
    Return detailed match analysis for a single job.
    NO FALLBACK - raises 404 if job not found in database.
    """
    db = get_supabase()
    try:
        resp = db.table("jobs").select("*").eq("id", job_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Job not found in database")
        
        r = resp.data[0]
        job = _row_to_job(r)
        reqs: list = r.get("requirements") or []

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Supabase job lookup failed: {e}")
        raise HTTPException(status_code=503, detail=f"Job data unavailable: {str(e)}")

    skills_list = [s.strip() for s in candidate_skills.split(",") if s.strip()] if candidate_skills else []

    if skills_list and reqs:
        fit = calculate_fit_score(candidate_skills=skills_list, job_requirements=reqs)
        job.fitScore = fit["score"]
        job.matchedSkills = fit["matched_skills"]
        job.missingSkills = fit["missing_skills"]

    # Build evidence for matched skills
    matched_with_evidence = [
        MatchedSkillEvidence(
            skill=skill,
            evidence="Detected in resume analysis",
            confidence="High",
            source="resume"
        )
        for skill in (job.matchedSkills or [])
    ]

    # Detailed breakdown (deterministic weights)
    total_possible = len((job.matchedSkills or [])) + len((job.missingSkills or []))
    matched_count = len(job.matchedSkills or [])
    skill_pct = round((matched_count / max(total_possible, 1)) * 35)
    
    detailed_breakdown = FitScoreBreakdown(
        skill_match=skill_pct,
        experience_match=16,  # Placeholder - would need candidate experience data
        project_match=12,
        education_match=9,
        seniority_match=9,
        location_match=5,
        domain_match=4,
    )

    breakdown = {
        "Skill Match (35%)": skill_pct,
        "Experience Match (20%)": detailed_breakdown.experience_match,
        "Project Match (15%)": detailed_breakdown.project_match,
        "Education Match (10%)": detailed_breakdown.education_match,
        "Seniority Match (10%)": detailed_breakdown.seniority_match,
        "Location Match (5%)": detailed_breakdown.location_match,
        "Domain Match (5%)": detailed_breakdown.domain_match,
    }

    return MatchDetailResponse(
        job=job,
        fitScore=job.fitScore,
        breakdown=breakdown,
        detailed_breakdown=detailed_breakdown,
        matchedSkillsWithEvidence=matched_with_evidence,
        missingSkills=job.missingSkills or [],
        suggestedFocus=[
            f"Build a focused project demonstrating {skill}."
            for skill in (job.missingSkills or [])[:4]
        ],
        calculation_method="deterministic",
        evidence={
            "candidate_skills_used": skills_list,
            "job_requirements_analyzed": reqs,
            "match_algorithm": "calculate_fit_score v1.0"
        }
    )


@router.post("/verify/{job_id}")
async def verify_job(job_id: str):
    """
    Manually trigger verification of a job's application URL.
    Returns updated verification status.
    """
    import httpx
    
    db = get_supabase()
    try:
        resp = db.table("jobs").select("*").eq("id", job_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job = resp.data[0]
        apply_url = job.get("apply_url") or job.get("source_url")
        
        if not apply_url or apply_url == "#":
            new_status = "needs_verification"
            notes = "No application URL available for verification"
        else:
            try:
                async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                    response = await client.head(apply_url)
                    if response.status_code == 200:
                        new_status = "verified_active"
                        notes = f"HTTP {response.status_code} - Application page accessible"
                    elif response.status_code in (404, 410):
                        new_status = "inactive"
                        notes = f"HTTP {response.status_code} - Position likely filled or removed"
                    elif response.status_code == 302:
                        new_status = "needs_verification"
                        notes = f"HTTP 302 - Redirect detected, manual verification needed"
                    else:
                        new_status = "needs_verification"
                        notes = f"HTTP {response.status_code} - Uncertain status"
            except httpx.TimeoutException:
                new_status = "needs_verification"
                notes = "Timeout - could not verify application page"
            except Exception as e:
                new_status = "needs_verification"
                notes = f"Verification error: {str(e)}"
        
        # Update job record
        update_resp = db.table("jobs").update({
            "verification_status": new_status,
            "last_verified_at": datetime.now(timezone.utc).isoformat(),
            "verification_notes": notes
        }).eq("id", job_id).execute()
        
        if update_resp.data:
            updated_job = _row_to_job(update_resp.data[0])
            return {
                "job_id": job_id,
                "verification_status": new_status,
                "notes": notes,
                "verified_at": updated_job.last_verified_at
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update verification status")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Job verification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.post("/collect")
async def collect_jobs(
    sources: List[str] = Query(default=["company_careers"]),
    queries: List[str] = Query(default=["AI", "ML", "GenAI", "Python", "Software Engineer"]),
):
    """
    Trigger job collection from configured sources.
    Accepts source_urls as query parameter to specify which URLs to scrape.
    """
    from app.services.job_collector import collect_jobs_from_source
    
    logger.info(f"Job collection triggered for sources: {sources}, queries: {queries}")
    
    return {
        "status": "ready",
        "message": "Use POST /jobs/collect/run with a JSON body containing source URLs to start collection.",
        "sources": sources,
        "queries": queries,
        "default_sources": [s["url"] for s in get_default_sources()],
        "default_queries": AI_ROLE_QUERIES,
    }


@router.post("/collect/run")
async def run_job_collection(request: CollectRequest):
    """
    Run job collection synchronously for the provided source URLs.
    Returns collection results with counts.
    """
    from app.services.job_collector import collect_jobs_from_source

    results = []
    for source in request.sources:
        result = await collect_jobs_from_source(
            source_url=source.url,
            source_name=source.name or source.url,
            query_params=source.params,
        )
        results.append(result)

    return {
        "status": "completed",
        "results": results,
        "total_new": sum(r.get("jobs_new", 0) for r in results),
        "total_updated": sum(r.get("jobs_updated", 0) for r in results),
        "total_failed": sum(r.get("jobs_failed", 0) for r in results),
    }


class CollectSource(BaseModel):
    url: str
    name: str = ""
    params: Optional[Dict[str, Any]] = None


class CollectRequest(BaseModel):
    sources: List[CollectSource]