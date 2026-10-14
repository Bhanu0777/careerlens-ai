"""
Market Intelligence API
Reads from Supabase market_skills and market_statistics tables.
NO FALLBACK MOCK DATA - returns empty results if no real data exists.
All statistics include source attribution.
"""
import logging
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.models.schemas import MarketSkillItem, MarketStatistic
from app.core.database import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/market", tags=["Market Intelligence"])


@router.get("/skills", response_model=List[MarketSkillItem])
async def get_market_skills():
    """
    Returns market skill demand data from Supabase market_skills table.
    Includes source attribution from market_statistics table.
    Returns empty list if no data available.
    """
    try:
        db = get_supabase()
        
        # Get base skills
        resp = db.table("market_skills") \
            .select("skill, demand_score, trend, category, job_count") \
            .order("demand_score", desc=True) \
            .execute()

        rows = resp.data or []
        if not rows:
            logger.info("market_skills table empty - no real market data available")
            return []

        # Get source attribution for each skill
        skills_resp = db.table("market_statistics") \
            .select("skill, source, source_url, job_count, total_jobs_analyzed, period_start, period_end, calculated_at") \
            .execute()
        
        sources_by_skill = {}
        if skills_resp.data:
            for s in skills_resp.data:
                skill = s["skill"]
                if skill not in sources_by_skill:
                    sources_by_skill[skill] = []
                sources_by_skill[skill].append({
                    "source": s.get("source"),
                    "source_url": s.get("source_url"),
                    "job_count": s.get("job_count"),
                    "total_analyzed": s.get("total_jobs_analyzed"),
                    "period_start": s.get("period_start"),
                    "period_end": s.get("period_end"),
                    "calculated_at": s.get("calculated_at"),
                })

        result = []
        for r in rows:
            skill_name = r["skill"]
            sources = sources_by_skill.get(skill_name, [])
            
            # Use most recent source for primary attribution
            primary_source = sources[0] if sources else {}
            
            result.append(MarketSkillItem(
                name=skill_name,
                demandPct=int(r.get("demand_score", 0)),
                trend=r.get("trend", "stable"),
                category=r.get("category", "Technical"),
                avgSalary=None,
                openingsCount=int(r.get("job_count", 0)),
                source=primary_source.get("source"),
                source_url=primary_source.get("source_url"),
                period_start=primary_source.get("period_start"),
                period_end=primary_source.get("period_end"),
                calculated_at=primary_source.get("calculated_at"),
            ))

        return result

    except Exception as e:
        logger.error(f"Supabase market_skills query failed: {e}")
        raise HTTPException(status_code=503, detail=f"Market data unavailable: {str(e)}")


@router.get("/skills/{skill_name}/sources")
async def get_skill_sources(skill_name: str):
    """
    Get all source attributions for a specific skill.
    Shows exactly where each demand number comes from.
    """
    try:
        db = get_supabase()
        resp = db.table("market_statistics") \
            .select("*") \
            .eq("skill", skill_name) \
            .order("calculated_at", desc=True) \
            .execute()

        return {
            "skill": skill_name,
            "sources": resp.data or [],
            "note": "Each entry represents an independent data source. Numbers may differ by methodology and timeframe."
        }
    except Exception as e:
        logger.error(f"Market sources query failed: {e}")
        raise HTTPException(status_code=503, detail=f"Source data unavailable: {str(e)}")


@router.get("/stats")
async def get_market_stats():
    """
    Returns aggregate market statistics derived from the jobs table.
    NO FALLBACK - returns actual counts or zeros.
    """
    try:
        db = get_supabase()
        
        # Count active verified jobs
        jobs_resp = db.table("jobs") \
            .select("id", count="exact") \
            .eq("status", "active") \
            .eq("verification_status", "verified_active") \
            .execute()
        verified_jobs = jobs_resp.count or 0
        
        # Count all active jobs
        all_jobs_resp = db.table("jobs") \
            .select("id", count="exact") \
            .eq("status", "active") \
            .execute()
        total_active_jobs = all_jobs_resp.count or 0

        # Get top skill from market_skills
        skills_resp = db.table("market_skills") \
            .select("skill, demand_score") \
            .order("demand_score", desc=True) \
            .limit(1) \
            .execute()
        top_skill = skills_resp.data[0]["skill"] if skills_resp.data else "No data"

        # Get latest collection log for data freshness
        log_resp = db.table("data_collection_log") \
            .select("started_at, jobs_found, source") \
            .order("started_at", desc=True) \
            .limit(5) \
            .execute()

        return {
            "verifiedJobsCount": verified_jobs,
            "totalActiveJobs": total_active_jobs,
            "topSkill": top_skill,
            "dataSource": "Supabase jobs table + market_statistics",
            "lastCollection": log_resp.data[0] if log_resp.data else None,
            "collectionHistory": log_resp.data or [],
        }
    except Exception as e:
        logger.error(f"Supabase stats query failed: {e}")
        raise HTTPException(status_code=503, detail=f"Stats unavailable: {str(e)}")


@router.get("/statistics", response_model=List[MarketStatistic])
async def get_market_statistics(
    skill: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = 100,
):
    """
    Get raw market statistics with full source attribution.
    Each record represents one measurement from one source.
    """
    try:
        db = get_supabase()
        q = db.table("market_statistics") \
            .select("*") \
            .order("calculated_at", desc=True) \
            .limit(limit)

        if skill:
            q = q.ilike("skill", f"%{skill}%")
        if source:
            q = q.eq("source", source)

        resp = q.execute()
        return resp.data or []
    except Exception as e:
        logger.error(f"Market statistics query failed: {e}")
        raise HTTPException(status_code=503, detail=f"Statistics unavailable: {str(e)}")