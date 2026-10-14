from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

# ─── Candidate Profile ────────────────────────────────────────────────────────

class SkillItem(BaseModel):
    name: str
    level: str = "Intermediate"
    category: str = "Technical"
    evidence: Optional[str] = None
    yearsOfExperience: Optional[float] = 1.0
    evidence_source: Literal["resume", "user_input", "github", "linkedin", "portfolio", "inferred"] = "resume"
    confidence_score: float = 1.0

class ExperienceItem(BaseModel):
    title: str
    company: str
    period: str
    description: List[str] = []
    technologies: List[str] = []

class ProjectItem(BaseModel):
    name: str
    description: str
    technologies: List[str] = []
    metrics: Optional[str] = None
    githubUrl: Optional[str] = None

class CandidateProfile(BaseModel):
    name: str = "Candidate"
    email: Optional[str] = None
    targetRole: str = "AI Engineer"
    experienceLevel: str = "Mid-Level"
    readinessScore: int = 82
    skills: List[SkillItem] = []
    experiences: List[ExperienceItem] = []
    projects: List[ProjectItem] = []
    summary: Optional[str] = None

class ResumeAuditResponse(BaseModel):
    overallScore: int
    breakdown: Dict[str, int]
    strengths: List[str]
    improvements: List[Dict[str, str]]
    extractedProfile: CandidateProfile

# ─── Market Intelligence ──────────────────────────────────────────────────────

class MarketSkillItem(BaseModel):
    name: str
    demandPct: int
    trend: Literal["rising", "stable", "emerging", "declining"]
    category: str
    avgSalary: Optional[str] = None
    openingsCount: int
    source: Optional[str] = None
    source_url: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    calculated_at: Optional[str] = None

class MarketStatistic(BaseModel):
    skill: str
    role: Optional[str] = None
    location: Optional[str] = None
    job_count: int
    total_jobs_analyzed: int
    demand_pct: Optional[float] = None
    source: str
    source_url: Optional[str] = None
    period_start: str
    period_end: str
    calculated_at: str

# ─── Jobs & Matching ──────────────────────────────────────────────────────────

class VerificationStatus(str, Enum):
    verified_active = "verified_active"
    needs_verification = "needs_verification"
    inactive = "inactive"
    expired = "expired"

class JobItem(BaseModel):
    id: str
    title: str
    company: str
    location: str
    salary: Optional[str] = None
    fitScore: int
    postedDate: str
    workMode: str
    experienceRequired: str
    description: str
    matchedSkills: List[str] = []
    partialSkills: List[str] = []
    missingSkills: List[str] = []
    source: str
    applyUrl: str
    # Provenance fields
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    first_seen_at: Optional[str] = None
    last_verified_at: Optional[str] = None
    verification_status: VerificationStatus = VerificationStatus.needs_verification
    content_hash: Optional[str] = None
    verification_notes: Optional[str] = None

class FitScoreBreakdown(BaseModel):
    skill_match: int
    experience_match: int
    project_match: int
    education_match: int
    seniority_match: int
    location_match: int
    domain_match: int

class MatchedSkillEvidence(BaseModel):
    skill: str
    evidence: str
    confidence: Literal["High", "Medium", "Low"]
    source: Literal["resume", "user_input", "github", "linkedin", "portfolio"]

class MatchDetailResponse(BaseModel):
    job: JobItem
    fitScore: int
    breakdown: Dict[str, int]
    detailed_breakdown: Optional[FitScoreBreakdown] = None
    matchedSkillsWithEvidence: List[MatchedSkillEvidence] = []
    missingSkills: List[str] = []
    suggestedFocus: List[str] = []
    calculation_method: Literal["deterministic", "ai_inference"] = "deterministic"
    evidence: Dict[str, Any] = {}

# ─── Resume Optimizer ─────────────────────────────────────────────────────────

class ResumeOptimizationRequest(BaseModel):
    jobTitle: str
    jobDescription: str
    currentBullets: List[str]

class BulletSuggestion(BaseModel):
    original: str
    optimized: str
    reason: str
    impactScore: str
    change_type: Literal["rephrase", "add_metric", "reorder", "add_keyword"] = "rephrase"

class ResumeOptimizationResponse(BaseModel):
    jobTitle: str
    matchScore: int
    estimatedMatchScore: int
    suggestions: List[BulletSuggestion]
    keywordAlignments: List[str]
    calculation_method: Literal["deterministic", "ai_inference"] = "deterministic"

# ─── Recruiter Messages ───────────────────────────────────────────────────────

class RecruiterMessageRequest(BaseModel):
    jobTitle: str
    company: str
    candidateName: str = "Candidate"
    candidateHighlights: List[str] = []

class RecruiterMessageResponse(BaseModel):
    subject: str
    body: str
    highlightsUsed: List[str]
    tips: List[str]
    recruiter_name: Optional[str] = None
    generated_by: Literal["ai", "template"] = "template"

# ─── Career Analysis ──────────────────────────────────────────────────────────

class CareerAnalysisRequest(BaseModel):
    target_role: str = "AI / Software Engineer"
    candidate_skills: List[str] = Field(default_factory=list)
    job_requirements: List[str] = Field(default_factory=list)
    market_skills: Dict[str, int] = Field(default_factory=dict)
    candidate_experience: Optional[str] = None
    required_experience: Optional[str] = None

class CareerAnalysisResponse(BaseModel):
    fit: Dict[str, Any]
    gaps: List[Dict[str, Any]]
    action_plan: Dict[str, Any]
    methodology: str
    data_sources: Dict[str, Any] = {}

# ─── Provenance / Data Sources ────────────────────────────────────────────────

class DataSource(BaseModel):
    type: Literal["resume", "job_posting", "market_data", "user_input", "github", "linkedin"]
    identifier: str
    url: Optional[str] = None
    retrieved_at: str
    confidence: Literal["High", "Medium", "Low"] = "High"

class ProvenanceResponse(BaseModel):
    candidate_data: List[DataSource]
    market_data: List[DataSource]
    job_data: List[DataSource]
    calculation_methods: Dict[str, str]
