"""
Career Intelligence API
Deterministic, evidence-based career analysis with full provenance tracking.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.career_intelligence import (
    calculate_fit_score,
    generate_action_plan,
    generate_gaps,
    calculate_career_readiness,
)

router = APIRouter(prefix="/career", tags=["Career Intelligence"])


class CareerAnalysisRequest(BaseModel):
    target_role: str = "AI / Software Engineer"
    candidate_skills: List[str] = Field(default_factory=list)
    candidate_projects: List[Dict[str, Any]] = Field(default_factory=list)
    candidate_experience: List[Dict[str, Any]] = Field(default_factory=list)
    job_requirements: List[str] = Field(default_factory=list)
    job_preferred_skills: List[str] = Field(default_factory=list)
    market_skills: Dict[str, int] = Field(default_factory=dict)
    candidate_experience_years: Optional[str] = None
    required_experience_years: Optional[str] = None


class CareerAnalysisResponse(BaseModel):
    fit: Dict[str, Any]
    gaps: List[Dict[str, Any]]
    action_plan: Dict[str, Any]
    career_readiness: Dict[str, Any]
    methodology: str
    data_sources: Dict[str, Any]
    calculation_methods: Dict[str, str]


@router.post("/analyze", response_model=CareerAnalysisResponse)
async def analyze_career(request: CareerAnalysisRequest) -> CareerAnalysisResponse:
    fit = calculate_fit_score(
        candidate_skills=request.candidate_skills,
        job_requirements=request.job_requirements,
        candidate_experience=request.candidate_experience_years or "",
        required_experience=request.required_experience_years or "",
        candidate_projects=[p.get("name", "") for p in request.candidate_projects],
        job_preferred_skills=request.job_preferred_skills,
    )
    
    gaps = generate_gaps(
        candidate_skills=request.candidate_skills,
        market_skills=request.market_skills,
        required_skills=request.job_requirements,
        target_role=request.target_role,
    )
    
    action_plan = generate_action_plan(
        request.target_role, 
        gaps, 
        request.candidate_skills
    )
    
    career_readiness = calculate_career_readiness(
        candidate_skills=request.candidate_skills,
        candidate_projects=request.candidate_projects,
        candidate_experience=request.candidate_experience,
        target_roles=[request.target_role],
        market_skills=request.market_skills,
    )
    
    return CareerAnalysisResponse(
        fit=fit,
        gaps=gaps,
        action_plan=action_plan,
        career_readiness=career_readiness,
        methodology=(
            "All scores computed deterministically from explicit evidence. "
            "Skill match: exact normalized string matching. "
            "Experience match: year-based calculation. "
            "Other factors use neutral defaults when data unavailable. "
            "No AI inference used in scoring."
        ),
        data_sources={
            "candidate_skills": "resume_extraction",
            "candidate_projects": "resume_extraction",
            "candidate_experience": "resume_extraction",
            "job_requirements": "job_posting_analysis",
            "market_skills": "market_statistics_table",
            "target_role": "user_input",
        },
        calculation_methods={
            "fit_score": "deterministic_v1",
            "gap_analysis": "market_demand_weighted_v1",
            "action_plan": "gap_prioritization_v1",
            "career_readiness": "weighted_composite_v1",
        },
    )


@router.get("/readiness")
async def get_readiness_components():
    """Returns the weight breakdown for career readiness calculation."""
    return {
        "weights": {
            "Technical Skills": 0.25,
            "Project Strength": 0.20,
            "Experience": 0.15,
            "Market Alignment": 0.20,
            "Resume Quality": 0.10,
            "Role Readiness": 0.10,
        },
        "description": "Career readiness is a CareerLens algorithmic estimate, not an employer's hiring decision.",
        "calculation_method": "weighted_composite_v1",
    }