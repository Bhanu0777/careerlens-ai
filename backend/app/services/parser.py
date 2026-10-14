import re
import io
from typing import List, Dict, Tuple, Any, Optional
from pypdf import PdfReader

# Comprehensive Tech Taxonomy for NLP Extraction
SKILL_TAXONOMY = {
    "Languages": [
        "Python", "JavaScript", "TypeScript", "C++", "C#", "Java", "Go", "Golang", "Rust", "Ruby", 
        "PHP", "Swift", "Kotlin", "SQL", "HTML", "CSS", "Bash", "Shell", "R", "Scala", "MATLAB"
    ],
    "AI & Machine Learning": [
        "PyTorch", "TensorFlow", "Keras", "Scikit-Learn", "HuggingFace", "LangChain", "LlamaIndex", 
        "Qdrant", "Pinecone", "ChromaDB", "Milvus", "Weaviate", "OpenAI", "Claude", "Gemini", 
        "Computer Vision", "NLP", "Natural Language Processing", "Transformers", "LLMs", "LoRA", 
        "RAG", "Deep Learning", "Machine Learning", "Fine-tuning", "MLflow", "Weights & Biases", 
        "Pandas", "NumPy", "OpenCV", "BERT", "NLTK", "Spacy"
    ],
    "Backend & APIs": [
        "FastAPI", "Django", "Flask", "Node.js", "Express", "NestJS", "Spring Boot", "ASP.NET", 
        "GraphQL", "REST", "gRPC", "Microservices", "Celery", "Redis", "Kafka", "RabbitMQ"
    ],
    "Frontend & Mobile": [
        "React", "Next.js", "Vue", "Nuxt", "Angular", "Svelte", "Tailwind CSS", "Redux", "Zustand", 
        "Flutter", "React Native", "SwiftUI", "Android"
    ],
    "Databases & Storage": [
        "PostgreSQL", "MySQL", "MongoDB", "SQLite", "DynamoDB", "Cassandra", "Supabase", "Firebase", 
        "Elasticsearch", "Neo4j", "Redis", "BigQuery", "Snowflake"
    ],
    "Cloud & DevOps": [
        "AWS", "Amazon Web Services", "GCP", "Google Cloud", "Azure", "Docker", "Kubernetes", "K8s", 
        "Terraform", "CI/CD", "GitHub Actions", "GitLab CI", "Jenkins", "Linux", "Nginx", "Prometheus", "Grafana"
    ]
}

ACTION_VERBS = {
    "lead": ["architected", "spearheaded", "orchestrated", "engineered", "designed", "developed", "led", "established"],
    "impact": ["optimized", "accelerated", "reduced", "increased", "boosted", "maximized", "streamlined", "improved"],
    "build": ["implemented", "created", "built", "constructed", "deployed", "integrated", "automated", "trained"]
}

def extract_text_from_pdf_bytes(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        pages_text = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                pages_text.append(t)
        return "\n".join(pages_text).strip()
    except Exception as e:
        return ""

def extract_email(text: str) -> Optional[str]:
    match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    return match.group(0) if match else None

def extract_phone(text: str) -> Optional[str]:
    match = re.search(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
    return match.group(0) if match else None

def extract_name(text: str) -> str:
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if not lines:
        return "Candidate"
    
    # Usually the name is on the top 1-3 lines and has 2-4 words without special symbols or keywords
    for line in lines[:5]:
        # Exclude headers, emails, links, or phone numbers
        if any(w in line.lower() for w in ['resume', 'curriculum', 'email', 'phone', '@', 'github', 'http', 'linkedin', 'education', 'skills', 'experience']):
            continue
        words = line.split()
        if 2 <= len(words) <= 4 and all(w.isalpha() or '.' in w for w in words):
            return line
    return lines[0][:40]

def extract_skills_from_text(text: str) -> List[Dict[str, Any]]:
    detected = []
    text_lower = text.lower()
    
    for category, skills in SKILL_TAXONOMY.items():
        for skill in skills:
            # Word boundary regex search to prevent partial matches like 'Go' in 'Google'
            escaped = re.escape(skill.lower())
            pattern = rf'(?<!\w){escaped}(?!\w)'
            matches = list(re.finditer(pattern, text_lower))
            if matches:
                count = len(matches)
                level = "Advanced" if count >= 3 else "Intermediate" if count == 2 else "Familiar"
                detected.append({
                    "name": skill,
                    "category": category,
                    "level": level,
                    "frequency": count,
                    "evidence": f"Found {count} reference(s) across resume sections."
                })
    
    # Sort by frequency descending
    detected.sort(key=lambda x: x["frequency"], reverse=True)
    return detected

def analyze_resume_text(text: str) -> Dict[str, Any]:
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    total_words = len(text.split())
    
    email = extract_email(text)
    phone = extract_phone(text)
    name = extract_name(text)
    skills = extract_skills_from_text(text)
    
    # Detect Sections
    has_skills_sec = bool(re.search(r'\b(skills|technical skills|technologies|proficiencies)\b', text, re.I))
    has_exp_sec = bool(re.search(r'\b(experience|work experience|employment|internships)\b', text, re.I))
    has_edu_sec = bool(re.search(r'\b(education|academic|degree|university|college)\b', text, re.I))
    has_proj_sec = bool(re.search(r'\b(projects|personal projects|technical projects|portfolio)\b', text, re.I))
    
    # Analyze Bullet Impact (Metrics, numbers, percentages)
    bullet_lines = [l for l in lines if l.startswith(('•', '-', '*', '–')) or (len(l) > 30 and any(v in l.lower() for v in ACTION_VERBS["impact"] + ACTION_VERBS["lead"]))]
    if not bullet_lines:
        bullet_lines = [l for l in lines if len(l) > 40]
    
    metric_pattern = re.compile(r'(\d+[\d,.]*(\%|\+?x|\s?ms|\s?k|\s?M|\s?pts|\s?users|\s?stars|\s?fps|\s?TB|\s?GB|\s?sec)?|\$\d+[\d,.]*)')
    metric_bullets = [b for b in bullet_lines if metric_pattern.search(b)]
    metric_ratio = len(metric_bullets) / max(len(bullet_lines), 1)
    
    # Calculate Real Metric Scores (0-100)
    
    # 1. Impact & Metrics Score
    impact_score = min(100, int(metric_ratio * 120 + (len(metric_bullets) * 5)))
    impact_score = max(30, min(98, impact_score))
    
    # 2. Skill Depth Score
    skill_count = len(skills)
    skill_score = min(98, max(35, skill_count * 6))
    
    # 3. ATS Formatting Score
    ats_score = 90
    if not has_skills_sec: ats_score -= 15
    if not has_exp_sec: ats_score -= 15
    if not has_edu_sec: ats_score -= 10
    if not email: ats_score -= 10
    if total_words < 200: ats_score -= 20
    if total_words > 1200: ats_score -= 10
    ats_score = max(40, min(98, ats_score))
    
    # 4. Completeness Score
    completeness_elements = [has_skills_sec, has_exp_sec, has_edu_sec, has_proj_sec, bool(email), bool(phone)]
    completeness_score = int((sum(completeness_elements) / len(completeness_elements)) * 100)
    completeness_score = max(40, min(100, completeness_score))
    
    # Overall Score (Weighted)
    overall = int(impact_score * 0.35 + skill_score * 0.25 + ats_score * 0.20 + completeness_score * 0.20)
    
    # Strengths Generated From Reality
    strengths = []
    if skill_count >= 8:
        top_names = [s["name"] for s in skills[:4]]
        strengths.append(f"Identified strong tech stack ({skill_count} skills detected including {', '.join(top_names)}).")
    if len(metric_bullets) >= 2:
        strengths.append(f"Found {len(metric_bullets)} quantified achievement bullet(s) containing concrete numerical results.")
    if has_proj_sec and has_exp_sec:
        strengths.append("Well-structured document balance between direct experience and hands-on technical projects.")
    if email and has_edu_sec:
        strengths.append("Clear contact identification and standard education credentials provided.")
    if not strengths:
        strengths.append("Document extracted successfully with foundational technical structure.")

    # Actionable Real Improvements
    improvements = []
    if metric_ratio < 0.4:
        pct_formatted = int(metric_ratio * 100)
        improvements.append({
            "level": "High",
            "text": f"Only {pct_formatted}% of your bullet points contain measurable metrics. Use the 'X-Y-Z' formula (Accomplished [X] as measured by [Y], by doing [Z])."
        })
    if skill_count < 6:
        improvements.append({
            "level": "High",
            "text": f"Detected only {skill_count} distinct technical skills. Explicitly list your tools, libraries, databases, and deployment platforms in a dedicated Skills section."
        })
    if not has_proj_sec:
        improvements.append({
            "level": "Medium",
            "text": "Add a dedicated 'Technical Projects' section with GitHub links, architectures, and performance numbers."
        })
    if not email:
        improvements.append({
            "level": "High",
            "text": "No valid email address was detected in the header. Ensure your email is plain readable text."
        })
    if total_words < 300:
        improvements.append({
            "level": "Medium",
            "text": "Your resume length is concise (< 300 words). Expand on your implementation details and technical responsibilities."
        })
    if not improvements:
        improvements.append({
            "level": "Low",
            "text": "Resume content is solid. Keep metrics updated with latest benchmark benchmarks and cloud deployments."
        })

    return {
        "name": name,
        "email": email or "Not detected in text",
        "totalWords": total_words,
        "skillsDetected": skills,
        "overallScore": overall,
        "breakdown": {
            "Impact & Metrics": impact_score,
            "Skill Depth": skill_score,
            "ATS Formatting": ats_score,
            "Completeness": completeness_score
        },
        "strengths": strengths,
        "improvements": improvements,
        "metricBulletsCount": len(metric_bullets),
        "totalBulletsCount": len(bullet_lines)
    }
