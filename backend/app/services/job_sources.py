"""
Job collection source configuration.
Defines company career page URLs and AI role queries for job collection.
"""
from typing import List, Dict, Any

COMPANY_CAREER_SOURCES: List[Dict[str, Any]] = [
    {"url": "https://www.sarvam.ai/careers", "name": "Sarvam AI"},
    {"url": "https://careers.microsoft.com/v2/global/en/india.html", "name": "Microsoft India"},
    {"url": "https://careers.google.com/jobs/results/?location=India", "name": "Google India"},
    {"url": "https://www.flipkart.com/careers", "name": "Flipkart"},
    {"url": "https://razorpay.com/jobs/", "name": "Razorpay"},
    {"url": "https://www.zepto.team/careers", "name": "Zepto"},
    {"url": "https://www.phonepe.com/careers/", "name": "PhonePe"},
    {"url": "https://careers.swiggy.com/", "name": "Swiggy"},
    {"url": "https://meesho.io/jobs", "name": "Meesho"},
    {"url": "https://www.zomato.com/careers", "name": "Zomato"},
    {"url": "https://groww.in/open-positions", "name": "Groww"},
    {"url": "https://ola.careers/", "name": "Ola"},
    {"url": "https://paytm.com/company/careers/", "name": "Paytm"},
    {"url": "https://careers.cred.club/", "name": "CRED"},
    {"url": "https://careers.dream11.com/", "name": "Dream11"},
]

AI_ROLE_QUERIES: List[str] = [
    "AI Engineer",
    "ML Engineer",
    "Data Scientist",
    "GenAI Engineer",
    "LLM Engineer",
    "Backend Engineer Python",
    "Full Stack Engineer",
    "Software Engineer II",
]

AI_FOCUSED_COMPANIES = [
    "Sarvam AI",
]


def get_default_sources() -> List[Dict[str, Any]]:
    """Return all configured company career page sources."""
    return COMPANY_CAREER_SOURCES


def get_ai_sources() -> List[Dict[str, Any]]:
    """Return only AI/ML focused company sources."""
    return [s for s in COMPANY_CAREER_SOURCES if s["name"] in AI_FOCUSED_COMPANIES]
