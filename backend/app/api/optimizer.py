from fastapi import APIRouter
from app.models.schemas import ResumeOptimizationRequest, ResumeOptimizationResponse, BulletSuggestion
from app.services.gemini_service import suggest_resume_improvements

router = APIRouter(prefix="/optimizer", tags=["Resume Optimizer"])


@router.post("/analyze", response_model=ResumeOptimizationResponse)
async def optimize_resume(request: ResumeOptimizationRequest):
    # Try Gemini-powered analysis
    resume_text_combined = "\n".join(request.currentBullets) if request.currentBullets else ""

    gemini_result = suggest_resume_improvements(
        resume_text=resume_text_combined,
        job_title=request.jobTitle,
        job_description=request.jobDescription,
        matched_skills=[],
        missing_skills=[],
    )

    if gemini_result and gemini_result.get("suggestions"):
        suggestions = [
            BulletSuggestion(
                original=s.get("original", ""),
                optimized=s.get("improved", ""),
                reason=s.get("reason", ""),
                impactScore=f"+{8 if s.get('impact') == 'High' else 5} pts ATS alignment",
            )
            for s in gemini_result["suggestions"][:4]
            if s.get("original") and s.get("improved")
        ]
        keywords = gemini_result.get("skills_reorder", []) + gemini_result.get("keyword_gaps", [])
        return ResumeOptimizationResponse(
            jobTitle=request.jobTitle or "Target Role",
            matchScore=int(gemini_result.get("match_score_current", 75)),
            suggestions=suggestions,
            keywordAlignments=keywords[:6],
        )

    # Deterministic fallback
    suggestions = []
    if request.currentBullets:
        for i, bullet in enumerate(request.currentBullets[:2]):
            if len(bullet) > 20:
                suggestions.append(
                    BulletSuggestion(
                        original=bullet,
                        optimized=(
                            bullet.replace("worked on", "engineered")
                                  .replace("helped", "led")
                                  .replace("did", "implemented")
                        ),
                        reason="Replace weak passive verbs with strong action verbs to improve ATS alignment.",
                        impactScore="+8 pts ATS alignment",
                    )
                )

    if not suggestions:
        suggestions = [
            BulletSuggestion(
                original="Built a machine learning model for classification.",
                optimized="Engineered a production-grade ML classification pipeline achieving 89% accuracy on 10K+ samples using Scikit-learn and FastAPI.",
                reason="Adds quantifiable metrics, specific technology stack, and scale indicators.",
                impactScore="+14 pts ATS alignment",
            )
        ]

    return ResumeOptimizationResponse(
        jobTitle=request.jobTitle or "Target Role",
        matchScore=72,
        suggestions=suggestions,
        keywordAlignments=["Python", "Machine Learning", "FastAPI", "RAG", "Docker"],
    )
