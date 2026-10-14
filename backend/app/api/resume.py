import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.schemas import ResumeAuditResponse, CandidateProfile, SkillItem, ExperienceItem, ProjectItem
from app.services.parser import extract_text_from_pdf_bytes, analyze_resume_text
from app.services.gemini_service import extract_resume_with_gemini

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resume", tags=["Resume Intelligence"])


def _build_response_from_gemini(raw_text: str, gemini: dict) -> ResumeAuditResponse:
    """Build a ResumeAuditResponse from a Gemini-extracted profile dict."""
    breakdown = gemini.get("readiness_breakdown", {})
    score = int(gemini.get("readiness_score", 70))

    skills_items = [
        SkillItem(
            name=s.get("name", ""),
            level=s.get("level", "Intermediate"),
            category=s.get("category", "Technical"),
            evidence=s.get("evidence"),
            yearsOfExperience=1.0,
        )
        for s in gemini.get("skills", [])
        if s.get("name")
    ]

    experiences = [
        ExperienceItem(
            title=e.get("title", "Role"),
            company=e.get("company", ""),
            period=e.get("period", ""),
            description=e.get("bullets", []),
            technologies=e.get("technologies", []),
        )
        for e in gemini.get("experience", [])
    ]

    projects = [
        ProjectItem(
            name=p.get("name", "Project"),
            description=p.get("description", ""),
            technologies=p.get("technologies", []),
            metrics=p.get("metrics"),
        )
        for p in gemini.get("projects", [])
    ]

    profile = CandidateProfile(
        name=gemini.get("name") or "Candidate",
        email=gemini.get("email"),
        targetRole=gemini.get("career_domains", ["Software Engineer"])[0] if gemini.get("career_domains") else "Software Engineer",
        experienceLevel=gemini.get("seniority_estimate", "Entry-level"),
        readinessScore=score,
        skills=skills_items,
        experiences=experiences,
        projects=projects,
        summary=gemini.get("summary"),
    )

    # Normalise breakdown keys to match frontend expectations
    bd: dict = {
        "Technical Skills": int(breakdown.get("technical", score)),
        "Project Strength": int(breakdown.get("projects", score)),
        "Experience": int(breakdown.get("experience", score)),
        "Market Alignment": int(breakdown.get("market_alignment", score)),
        "Resume Quality": int(breakdown.get("resume_quality", score)),
        "Role Readiness": int(breakdown.get("role_readiness", score)),
    }

    strengths = gemini.get("strengths", [])
    if not strengths:
        strengths = ["Resume successfully extracted and analyzed."]

    improvements = [
        {"level": i.get("level", "Medium"), "text": i.get("text", "")}
        for i in gemini.get("improvements", [])
        if i.get("text")
    ]
    if not improvements:
        improvements = [{"level": "Low", "text": "Resume content is solid. Keep metrics updated."}]

    return ResumeAuditResponse(
        overallScore=score,
        breakdown=bd,
        strengths=strengths,
        improvements=improvements,
        extractedProfile=profile,
    )


def _build_response_from_heuristics(raw_text: str) -> ResumeAuditResponse:
    """Fallback: build response using the NLP heuristic parser."""
    analysis = analyze_resume_text(raw_text)

    skills_items = [
        SkillItem(
            name=s["name"],
            level=s["level"],
            category=s["category"],
            evidence=s["evidence"],
            yearsOfExperience=round(max(0.5, s["frequency"] * 0.5), 1),
        )
        for s in analysis["skillsDetected"]
    ]

    profile = CandidateProfile(
        name=analysis["name"],
        email=analysis["email"],
        targetRole="AI / Software Engineer",
        experienceLevel="Entry / Mid-Level" if len(skills_items) < 8 else "Mid / Senior-Level",
        readinessScore=analysis["overallScore"],
        skills=skills_items,
        experiences=[
            ExperienceItem(
                title="Professional & Internship Work",
                company="Extracted from resume",
                period="Recent",
                description=[
                    f"Analyzed {analysis['totalBulletsCount']} bullet points.",
                    f"Verified {analysis['metricBulletsCount']} quantified impact bullets.",
                ],
                technologies=[s.name for s in skills_items[:5]],
            )
        ],
        projects=[
            ProjectItem(
                name="Extracted Project Work",
                description=f"Detected {len(skills_items)} technical skills.",
                technologies=[s.name for s in skills_items[:4]],
                metrics=f"{analysis['metricBulletsCount']} impact statements",
            )
        ],
        summary=f"Resume parsed: {analysis['totalWords']} words, {len(skills_items)} skills detected.",
    )

    return ResumeAuditResponse(
        overallScore=analysis["overallScore"],
        breakdown=analysis["breakdown"],
        strengths=analysis["strengths"],
        improvements=analysis["improvements"],
        extractedProfile=profile,
    )


@router.post("/upload", response_model=ResumeAuditResponse)
async def upload_and_analyze_resume(file: UploadFile = File(...)):
    """
    Upload a resume PDF or TXT and return a structured career analysis.
    Uses Gemini LLM when available; falls back to NLP heuristics.
    """
    filename = (file.filename or "").lower()
    if not (filename.endswith(".pdf") or filename.endswith(".txt") or filename.endswith(".docx")):
        raise HTTPException(status_code=400, detail="Only PDF, TXT, and DOCX files are supported.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Extract raw text
    raw_text = ""
    if filename.endswith(".pdf"):
        raw_text = extract_text_from_pdf_bytes(contents)
    else:
        raw_text = contents.decode("utf-8", errors="ignore")

    if not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail=(
                "Could not extract readable text. "
                "Ensure the PDF is text-based (not a scanned image) or submit a TXT file."
            ),
        )

    # Try Gemini LLM extraction first
    gemini_result = extract_resume_with_gemini(raw_text)
    if gemini_result:
        logger.info("Using Gemini extraction for resume analysis.")
        return _build_response_from_gemini(raw_text, gemini_result)

    # Fallback to heuristic parser
    logger.info("Gemini unavailable — using heuristic parser.")
    return _build_response_from_heuristics(raw_text)
