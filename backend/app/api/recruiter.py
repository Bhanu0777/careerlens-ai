from fastapi import APIRouter
from app.models.schemas import RecruiterMessageRequest, RecruiterMessageResponse
from app.services.gemini_service import generate_recruiter_message

router = APIRouter(prefix="/recruiter", tags=["Recruiter Outreach Generator"])


@router.post("/generate", response_model=RecruiterMessageResponse)
async def generate_recruiter_message_endpoint(req: RecruiterMessageRequest):
    # Attempt Gemini generation
    candidate_summary = (
        f"{req.candidateName}, specializing in AI/ML with hands-on experience. "
        + (f"Highlights: {', '.join(req.candidateHighlights[:3])}." if req.candidateHighlights else "")
    )

    gemini_result = generate_recruiter_message(
        job_title=req.jobTitle,
        company=req.company,
        candidate_name=req.candidateName,
        candidate_summary=candidate_summary,
        matched_skills=req.candidateHighlights[:4],
        relevant_project=req.candidateHighlights[0] if req.candidateHighlights else "",
    )

    if gemini_result:
        subject = gemini_result.get("subject", f"Application: {req.jobTitle} at {req.company}")
        body = gemini_result.get("body", "")
    else:
        # Deterministic fallback
        highlights_str = (
            ", ".join(req.candidateHighlights[:2])
            if req.candidateHighlights
            else "AI/ML engineering"
        )
        subject = f"Connecting regarding {req.jobTitle} role at {req.company}"
        body = (
            f"Hi Hiring Team,\n\n"
            f"I came across the {req.jobTitle} opportunity at {req.company} and was genuinely excited by the role.\n\n"
            f"I'm {req.candidateName}, a final-year CS student specializing in AI/ML with hands-on experience "
            f"in {highlights_str}.\n\n"
            f"The role caught my attention because it aligns directly with my recent project work and internship "
            f"in Generative AI. I'd love to connect and learn more.\n\n"
            f"Best regards,\n{req.candidateName}"
        )

    return RecruiterMessageResponse(
        subject=subject,
        body=body,
        highlightsUsed=req.candidateHighlights[:3],
        tips=[
            "Always find the specific recruiter's name on LinkedIn before sending.",
            "Send messages Tuesday–Thursday mornings for best reply rates.",
            "Keep outreach under 150 words for mobile readability.",
        ],
    )
