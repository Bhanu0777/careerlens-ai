"""
Supabase Service Layer
Handles all database operations for CareerLens AI
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.database import get_supabase
from app.models.schemas import (
    CandidateProfile, SkillItem, ExperienceItem, ProjectItem,
    JobItem, MatchDetailResponse
)

class SupabaseService:
    """Service class for Supabase operations"""

    def __init__(self):
        self.supabase = get_supabase()

    # User Operations
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        response = self.supabase.table('users').insert(user_data).execute()
        return response.data[0] if response.data else None

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        response = self.supabase.table('users').select('*').eq('id', user_id).execute()
        return response.data[0] if response.data else None

    def update_user(self, user_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile"""
        response = self.supabase.table('users').update(user_data).eq('id', user_id).execute()
        return response.data[0] if response.data else None

    # Resume Operations
    def save_resume(self, user_id: str, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save resume parsing results"""
        response = self.supabase.table('resumes').insert({
            'user_id': user_id,
            'file_url': resume_data.get('file_url'),
            'file_name': resume_data.get('file_name'),
            'parsed_data': resume_data.get('parsed_data')
        }).execute()
        return response.data[0] if response.data else None

    def get_user_resumes(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all resumes for a user"""
        response = self.supabase.table('resumes').select('*').eq('user_id', user_id).execute()
        return response.data if response.data else []

    # Skills Operations
    def save_skills(self, user_id: str, skills: List[SkillItem]) -> List[Dict[str, Any]]:
        """Save user skills"""
        skill_data = [
            {
                'user_id': user_id,
                'name': skill.name,
                'category': skill.category,
                'candidate_level': skill.level,
                'evidence': skill.evidence,
                'years_of_experience': skill.yearsOfExperience
            }
            for skill in skills
        ]
        response = self.supabase.table('skills').insert(skill_data).execute()
        return response.data if response.data else []

    def get_user_skills(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all skills for a user"""
        response = self.supabase.table('skills').select('*').eq('user_id', user_id).execute()
        return response.data if response.data else []

    def update_skills(self, user_id: str, skills: List[SkillItem]) -> List[Dict[str, Any]]:
        """Update user skills (delete old, insert new)"""
        # Delete existing skills
        self.supabase.table('skills').delete().eq('user_id', user_id).execute()
        # Insert new skills
        return self.save_skills(user_id, skills)

    # Jobs Operations
    def save_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save a job posting"""
        response = self.supabase.table('jobs').insert(job_data).execute()
        return response.data[0] if response.data else None

    def get_jobs(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get jobs with optional filters"""
        query = self.supabase.table('jobs').select('*')

        if filters:
            if 'location' in filters:
                query = query.eq('location', filters['location'])
            if 'work_mode' in filters:
                query = query.eq('work_mode', filters['work_mode'])
            if 'status' in filters:
                query = query.eq('status', filters['status'])

        response = query.execute()
        return response.data if response.data else []

    def get_job_by_id(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job by ID"""
        response = self.supabase.table('jobs').select('*').eq('id', job_id).execute()
        return response.data[0] if response.data else None

    # Job Matches Operations
    def save_job_match(self, user_id: str, job_id: str, match_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save job match analysis"""
        response = self.supabase.table('job_matches').insert({
            'user_id': user_id,
            'job_id': job_id,
            'fit_score': match_data.get('fit_score'),
            'matched_skills': match_data.get('matched_skills'),
            'missing_skills': match_data.get('missing_skills'),
            'partial_skills': match_data.get('partial_skills'),
            'explanation': match_data.get('explanation'),
            'breakdown': match_data.get('breakdown')
        }).execute()
        return response.data[0] if response.data else None

    def get_user_job_matches(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all job matches for a user"""
        response = self.supabase.table('job_matches').select(
            '*, jobs(*)'
        ).eq('user_id', user_id).execute()
        return response.data if response.data else []

    # Market Skills Operations
    def update_market_skill(self, skill_name: str, skill_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update or insert market skill data"""
        response = self.supabase.table('market_skills').upsert({
            'skill': skill_name,
            **skill_data,
            'updated_at': datetime.utcnow().isoformat()
        }).execute()
        return response.data[0] if response.data else None

    def get_market_skills(self) -> List[Dict[str, Any]]:
        """Get all market skills"""
        response = self.supabase.table('market_skills').select('*').execute()
        return response.data if response.data else []

    # Applications Operations
    def save_application(self, user_id: str, job_id: str, status: str = 'Saved') -> Dict[str, Any]:
        """Save or update application status"""
        response = self.supabase.table('applications').upsert({
            'user_id': user_id,
            'job_id': job_id,
            'status': status,
            'applied_at': datetime.utcnow().isoformat() if status == 'Applied' else None
        }).execute()
        return response.data[0] if response.data else None

    def get_user_applications(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all applications for a user"""
        response = self.supabase.table('applications').select(
            '*, jobs(*)'
        ).eq('user_id', user_id).execute()
        return response.data if response.data else []

    def update_application_status(self, application_id: str, status: str) -> Dict[str, Any]:
        """Update application status"""
        response = self.supabase.table('applications').update({
            'status': status,
            'applied_at': datetime.utcnow().isoformat() if status == 'Applied' else None
        }).eq('id', application_id).execute()
        return response.data[0] if response.data else None

# Global service instance
supabase_service = SupabaseService()
