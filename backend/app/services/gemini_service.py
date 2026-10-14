"""
Gemini LLM service for CareerLens AI.

Responsibilities:
  - Structured resume extraction (name, education, experience, projects, skills)
  - Skill categorization and evidence mapping
  - Career readiness scoring with explanation
  - Skill gap reasoning
  - Resume improvement suggestions

All outputs are grounded in the provided resume text.
The LLM is explicitly instructed never to fabricate information.
"""

import json
import re
import logging
import warnings
from typing import Any, Dict, Optional
from app.core.config import settings

# Suppress Google GenAI AFC recommendation warning (not applicable for single-turn generation)
warnings.filterwarnings("ignore", message=".*automatic function calling.*")

logger = logging.getLogger(__name__)

_client = None
_model_name = "gemini-3.8-flash"


def _get_client():
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY:
            return None
        try:
            import google.genai as genai  # type: ignore
            _client = genai.Client(api_key=settings.GEMINI_API_KEY)
        except Exception as e:
            logger.warning(f"Gemini client init failed: {e}")
            _client = None
    return _client


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    """Extract first valid JSON object from an LLM response string."""
    # Try direct parse
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass
    # Try stripping markdown code fences
    cleaned = re.sub(r"```(?:json)?", "", text).strip().strip("`").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    # Extract first { … } block
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return None


def extract_resume_with_gemini(resume_text: str) -> Optional[Dict[str, Any]]:
    """
    Use Gemini to extract a structured candidate profile from raw resume text.

    Returns a dict with keys:
        name, email, phone, linkedin, github,
        education: [{degree, institution, year, gpa?}],
        experience: [{title, company, period, bullets: [str], technologies: [str]}],
        projects: [{name, description, technologies: [str], metrics?}],
        skills: [{name, category, level, evidence}],
        certifications: [str],
        achievements: [str],
        summary: str,
        seniority_estimate: str,
        career_domains: [str],
        readiness_score: int,
        readiness_breakdown: {technical, projects, experience, market_alignment, resume_quality, role_readiness},
        strengths: [str],
        improvements: [{level: "High|Medium|Low", text: str}]

    Returns None if the API key is missing or the call fails — caller falls back to heuristics.
    """
    client = _get_client()
    if client is None:
        return None

    prompt = f"""
You are a professional resume analyst. Analyze the following resume text and return ONLY a valid JSON object.

CRITICAL RULES:
- Only extract information explicitly stated in the resume text.
- Never invent skills, experience, projects, metrics, or certifications that are not in the text.
- If information is absent, use null or an empty array.
- Seniority must be estimated from evidence: years of experience, degree, internships, full-time roles.
- All skill levels must be: "Expert" | "Strong" | "Intermediate" | "Familiar" | "Beginner"
- readiness_score: integer 0-100 based on technical depth, project quality, experience, resume structure.
- readiness_breakdown: each sub-score is 0-100.

Return this exact JSON structure:
{{
  "name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "linkedin": "string or null",
  "github": "string or null",
  "education": [
    {{"degree": "string", "institution": "string", "year": "string or null", "gpa": "string or null"}}
  ],
  "experience": [
    {{"title": "string", "company": "string", "period": "string", "bullets": ["string"], "technologies": ["string"]}}
  ],
  "projects": [
    {{"name": "string", "description": "string", "technologies": ["string"], "metrics": "string or null"}}
  ],
  "skills": [
    {{"name": "string", "category": "string", "level": "string", "evidence": "string"}}
  ],
  "certifications": ["string"],
  "achievements": ["string"],
  "summary": "2-3 sentence professional summary based only on resume content",
  "seniority_estimate": "Fresher | Entry-level | Junior | Mid-Level | Senior",
  "career_domains": ["string"],
  "readiness_score": 0,
  "readiness_breakdown": {{
    "technical": 0,
    "projects": 0,
    "experience": 0,
    "market_alignment": 0,
    "resume_quality": 0,
    "role_readiness": 0
  }},
  "strengths": ["string"],
  "improvements": [
    {{"level": "High | Medium | Low", "text": "string"}}
  ]
}}

RESUME TEXT:
---
{resume_text[:8000]}
---

Return ONLY the JSON. No explanation, no markdown fences.
"""

    try:
        response = client.models.generate_content(
            model=_model_name,
            contents=prompt,
        )
        raw = response.text or ""
        result = _extract_json(raw)
        if result:
            logger.info(f"Gemini extracted {len(result.get('skills', []))} skills for candidate: {result.get('name')}")
        return result
    except Exception as e:
        logger.warning(f"Gemini resume extraction failed: {e}")
        return None


def generate_career_explanation(
    candidate_summary: str,
    target_role: str,
    matched_skills: list,
    missing_skills: list,
    fit_score: int,
) -> str:
    """
    Generate a 2–3 sentence explanation of why the candidate fits (or doesn't fit) a role.
    Grounded in the provided evidence — no fabrication.
    """
    client = _get_client()
    if client is None:
        matched = ", ".join(matched_skills[:4]) if matched_skills else "none"
        missing = ", ".join(missing_skills[:3]) if missing_skills else "none"
        return (
            f"Fit score: {fit_score}/100 based on {len(matched_skills)} matched skills including {matched}. "
            f"Gap skills: {missing}."
        )

    prompt = f"""
You are an honest career advisor. Write 2-3 sentences explaining why the candidate has a {fit_score}/100 fit for the role of {target_role}.

Candidate summary: {candidate_summary}
Matched skills: {', '.join(matched_skills) if matched_skills else 'none'}
Missing skills: {', '.join(missing_skills) if missing_skills else 'none'}

Rules:
- Be specific and evidence-based.
- Do not fabricate skills or experience not in the candidate summary.
- Keep it professional and constructive.
- Return plain text only, no JSON.
"""
    try:
        response = client.models.generate_content(model=_model_name, contents=prompt)
        return (response.text or "").strip()
    except Exception:
        return f"Fit score {fit_score}/100 based on matched skills: {', '.join(matched_skills[:3])}."


def suggest_resume_improvements(
    resume_text: str,
    job_title: str,
    job_description: str,
    matched_skills: list,
    missing_skills: list,
) -> Optional[Dict[str, Any]]:
    """
    Return structured resume improvement suggestions for a specific job.
    Never fabricates experience — only suggests rephrasing/reorganising existing content.
    """
    client = _get_client()
    if client is None:
        return None

    prompt = f"""
You are an expert resume coach. Analyze how the candidate's resume can be improved for the role: {job_title}.

Job description excerpt: {job_description[:1500]}

Candidate already has: {', '.join(matched_skills)}
Candidate is missing: {', '.join(missing_skills)}

Resume text:
---
{resume_text[:4000]}
---

CRITICAL RULES:
- Never invent skills, experience, metrics, or certifications not in the resume.
- Only suggest honest improvements: keyword alignment, rephrasing, reordering, adding measurable context already present.

Return ONLY this JSON:
{{
  "match_score_current": integer 0-100,
  "match_score_estimated": integer 0-100,
  "keyword_gaps": ["string"],
  "suggestions": [
    {{
      "section": "string",
      "original": "string",
      "improved": "string",
      "reason": "string",
      "impact": "High | Medium | Low"
    }}
  ],
  "summary_suggestion": "string or null",
  "skills_reorder": ["string"]
}}
"""
    try:
        response = client.models.generate_content(model=_model_name, contents=prompt)
        raw = response.text or ""
        return _extract_json(raw)
    except Exception as e:
        logger.warning(f"Gemini resume improvement failed: {e}")
        return None


def generate_recruiter_message(
    job_title: str,
    company: str,
    candidate_name: str,
    candidate_summary: str,
    matched_skills: list,
    relevant_project: str = "",
) -> Optional[Dict[str, str]]:
    """Generate a personalized LinkedIn recruiter outreach message."""
    client = _get_client()
    if client is None:
        return None

    prompt = f"""
Write a personalized LinkedIn message for a job application.

Candidate: {candidate_name}
Candidate summary: {candidate_summary}
Role: {job_title} at {company}
Matching skills: {', '.join(matched_skills[:4])}
Relevant project: {relevant_project or 'Not specified'}

Rules:
- Under 150 words
- Professional, specific, not generic
- Reference the specific role and company
- Mention 1-2 actual skills or projects
- No fabricated achievements
- End with a clear, polite ask
- Return ONLY this JSON: {{"subject": "string", "body": "string"}}
"""
    try:
        response = client.models.generate_content(model=_model_name, contents=prompt)
        raw = response.text or ""
        return _extract_json(raw)
    except Exception as e:
        logger.warning(f"Gemini recruiter message failed: {e}")
        return None
