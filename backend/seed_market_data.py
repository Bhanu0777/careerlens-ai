"""
Seed script for market_skills and market_statistics tables.
Inserts realistic India AI/ML 2024 market data.

Usage:
    python seed_market_data.py
"""

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the backend directory (same folder as this script)
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

from supabase import create_client, Client  # noqa: E402


def get_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set in backend/.env")
        sys.exit(1)
    return create_client(url, key)


# ---------------------------------------------------------------------------
# Market skills data — India AI/ML 2024
# ---------------------------------------------------------------------------
UPDATED_AT = "2024-12-01T00:00:00+00:00"

MARKET_SKILLS = [
    {"skill": "Python",          "demand_score": 95, "trend": "rising",   "category": "Languages", "job_count": 18500, "updated_at": UPDATED_AT},
    {"skill": "Machine Learning","demand_score": 88, "trend": "rising",   "category": "AI/ML",     "job_count": 14200, "updated_at": UPDATED_AT},
    {"skill": "LLMs",            "demand_score": 85, "trend": "rising",   "category": "AI/ML",     "job_count": 11800, "updated_at": UPDATED_AT},
    {"skill": "GenAI",           "demand_score": 83, "trend": "emerging", "category": "AI/ML",     "job_count": 10500, "updated_at": UPDATED_AT},
    {"skill": "React",           "demand_score": 80, "trend": "stable",   "category": "Frontend",  "job_count": 16200, "updated_at": UPDATED_AT},
    {"skill": "FastAPI",         "demand_score": 74, "trend": "rising",   "category": "Backend",   "job_count":  8900, "updated_at": UPDATED_AT},
    {"skill": "TypeScript",      "demand_score": 78, "trend": "rising",   "category": "Languages", "job_count": 12100, "updated_at": UPDATED_AT},
    {"skill": "SQL",             "demand_score": 82, "trend": "stable",   "category": "Databases", "job_count": 17000, "updated_at": UPDATED_AT},
    {"skill": "Docker",          "demand_score": 76, "trend": "stable",   "category": "DevOps",    "job_count": 11200, "updated_at": UPDATED_AT},
    {"skill": "Kubernetes",      "demand_score": 68, "trend": "stable",   "category": "DevOps",    "job_count":  7800, "updated_at": UPDATED_AT},
    {"skill": "NLP",             "demand_score": 72, "trend": "rising",   "category": "AI/ML",     "job_count":  8400, "updated_at": UPDATED_AT},
    {"skill": "RAG",             "demand_score": 79, "trend": "emerging", "category": "AI/ML",     "job_count":  7200, "updated_at": UPDATED_AT},
    {"skill": "PyTorch",         "demand_score": 71, "trend": "rising",   "category": "AI/ML",     "job_count":  8100, "updated_at": UPDATED_AT},
    {"skill": "TensorFlow",      "demand_score": 69, "trend": "stable",   "category": "AI/ML",     "job_count":  7600, "updated_at": UPDATED_AT},
    {"skill": "Node.js",         "demand_score": 75, "trend": "stable",   "category": "Backend",   "job_count": 13500, "updated_at": UPDATED_AT},
]

# Sources to distribute market_statistics rows across
SOURCES = [
    {"source": "jobspiq.in",       "source_url": "https://jobspiq.in"},
    {"source": "naukri.com",       "source_url": "https://www.naukri.com"},
    {"source": "linkedin.com/jobs","source_url": "https://www.linkedin.com/jobs"},
]

TOTAL_JOBS_ANALYZED = 50000
ROLE = "AI/ML Engineer"
LOCATION = "India"
PERIOD_START = "2024-01-01"
PERIOD_END   = "2024-12-31"


def build_market_statistics(skills):
    """Build market_statistics rows: 3 source rows per skill."""
    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for skill_row in skills:
        skill = skill_row["skill"]
        job_count = skill_row["job_count"]
        demand_pct = round(job_count / TOTAL_JOBS_ANALYZED * 100, 2)
        for src in SOURCES:
            rows.append({
                "skill":               skill,
                "role":                ROLE,
                "location":            LOCATION,
                "job_count":           job_count,
                "total_jobs_analyzed": TOTAL_JOBS_ANALYZED,
                "demand_pct":          demand_pct,
                "source":              src["source"],
                "source_url":          src["source_url"],
                "period_start":        PERIOD_START,
                "period_end":          PERIOD_END,
                "calculated_at":       now,
                "metadata":            {"collected_by": "seed_script", "version": "1.0"},
            })
    return rows


def seed_market_skills(supabase: Client, skills: list) -> int:
    """Upsert market_skills rows keyed on 'skill'. Returns count upserted."""
    result = (
        supabase.table("market_skills")
        .upsert(skills, on_conflict="skill")
        .execute()
    )
    return len(result.data) if result.data else 0


def seed_market_statistics(supabase: Client, rows: list) -> int:
    """Insert market_statistics rows, ignoring duplicates. Returns count inserted."""
    inserted = 0
    for row in rows:
        try:
            result = (
                supabase.table("market_statistics")
                .insert(row, count="exact")
                .execute()
            )
            if result.data:
                inserted += len(result.data)
        except Exception as exc:
            # Silently skip duplicate / constraint violations
            msg = str(exc).lower()
            if "duplicate" in msg or "unique" in msg or "23505" in msg:
                pass
            else:
                print(f"  Warning: unexpected error inserting {row.get('skill')} / {row.get('source')}: {exc}")
    return inserted


def main():
    print("Initializing Supabase client...")
    supabase = get_client()

    # --- market_skills ---
    print(f"Upserting {len(MARKET_SKILLS)} rows into market_skills...")
    skills_count = seed_market_skills(supabase, MARKET_SKILLS)
    print(f"  market_skills: {skills_count} rows upserted.")

    # --- market_statistics ---
    stats_rows = build_market_statistics(MARKET_SKILLS)
    print(f"Inserting {len(stats_rows)} rows into market_statistics...")
    stats_count = seed_market_statistics(supabase, stats_rows)
    print(f"  market_statistics: {stats_count} rows inserted.")

    print("\nSeed complete.")
    print(f"  market_skills upserted : {skills_count}")
    print(f"  market_statistics inserted: {stats_count}")


if __name__ == "__main__":
    main()
