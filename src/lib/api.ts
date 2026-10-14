import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    return { 'Authorization': `Bearer ${session.access_token}` }
  }
  return {}
}

export type CareerAnalysis = {
  fit: {
    score: number
    matchedSkills: string[]
    missingSkills: string[]
    breakdown: Record<string, number>
    raw_scores?: Record<string, any>
    details?: Record<string, string>
    calculation_method?: string
    calculated_at?: string
  }
  gaps: Array<{
    name: string
    opportunityScore: number
    priority: string
    why: string
    candidateLevel: string
    marketDemand: string
    evidence?: Record<string, any>
    recommendation?: string
    estimated_effort_weeks?: number
  }>
  actionPlan: {
    targetRole: string
    weeks: Array<{
      week: number
      title: string
      tasks: Array<{ description: string; priority: string; type?: string; skill?: string | null }>
    }>
    methodology: string
    generated_at: string
  }
  career_readiness: {
    overall: number
    breakdown: Record<string, number>
    details: Record<string, string>
    label: string
    disclaimer: string
    calculation_method: string
    calculated_at: string
  }
  methodology: string
  data_sources: Record<string, any>
  calculation_methods: Record<string, string>
}

export async function analyzeCareer(payload: {
  targetRole: string
  candidateSkills: string[]
  jobRequirements: string[]
  marketSkills: Record<string, number>
  candidateExperience?: string
  requiredExperience?: string
  candidateProjects?: Array<{ name: string; technologies: string[] }>
  candidateExperienceList?: Array<{ title: string; company: string; duration: string }>
  jobPreferredSkills?: string[]
}) {
  const response = await fetch(`${API_BASE}/career/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
    body: JSON.stringify({
      target_role: payload.targetRole,
      candidate_skills: payload.candidateSkills,
      candidate_projects: payload.candidateProjects || [],
      candidate_experience: payload.candidateExperienceList || [],
      job_requirements: payload.jobRequirements,
      job_preferred_skills: payload.jobPreferredSkills || [],
      market_skills: payload.marketSkills,
      candidate_experience_years: payload.candidateExperience,
      required_experience_years: payload.requiredExperience,
    }),
  })
  if (!response.ok) throw new Error('Unable to analyze career evidence')
  const data = await response.json()
  return {
    fit: {
      score: data.fit.score,
      matchedSkills: data.fit.matched_skills,
      missingSkills: data.fit.missing_skills,
      breakdown: data.fit.breakdown,
      raw_scores: data.fit.raw_scores,
      details: data.fit.details,
      calculation_method: data.fit.calculation_method,
      calculated_at: data.fit.calculated_at,
    },
    gaps: data.gaps.map((gap: any) => ({
      name: gap.name,
      opportunityScore: gap.opportunity_score,
      priority: gap.priority,
      why: gap.why,
      candidateLevel: gap.candidateLevel,
      marketDemand: gap.marketDemand,
      evidence: gap.evidence,
      recommendation: gap.recommendation,
      estimated_effort_weeks: gap.estimated_effort_weeks,
    })),
    actionPlan: {
      targetRole: data.action_plan.target_role,
      weeks: data.action_plan.weeks,
      methodology: data.action_plan.methodology,
      generated_at: data.action_plan.generated_at,
    },
    career_readiness: data.career_readiness,
    methodology: data.methodology,
    data_sources: data.data_sources,
    calculation_methods: data.calculation_methods,
  } satisfies CareerAnalysis
}

export async function fetchMarketStats() {
  const res = await fetch(`${API_BASE}/market/stats`)
  if (!res.ok) throw new Error('Unable to fetch market statistics')
  return await res.json()
}

export async function fetchMarketStatistics() {
  const res = await fetch(`${API_BASE}/market/statistics`)
  if (!res.ok) throw new Error('Unable to fetch market statistics')
  return await res.json()
}

export async function fetchJobs(query = '', workMode = '') {
  const params = new URLSearchParams()
  if (query) params.append('query', query)
  if (workMode && workMode !== 'all') params.append('workMode', workMode)
  const res = await fetch(`${API_BASE}/jobs?${params.toString()}`)
  if (!res.ok) throw new Error('Unable to fetch jobs')
  return await res.json()
}

export async function fetchVerifiedActiveJobs(candidateSkills?: string[]) {
  const params = new URLSearchParams()
  if (candidateSkills && candidateSkills.length) {
    params.append('candidate_skills', candidateSkills.join(','))
  }
  const res = await fetch(`${API_BASE}/jobs/verified-active?${params.toString()}`)
  if (!res.ok) throw new Error('Unable to fetch verified jobs')
  return await res.json()
}

export async function verifyJob(jobId: string) {
  const res = await fetch(`${API_BASE}/jobs/verify/${jobId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Unable to verify job')
  return await res.json()
}

export async function getJobMatch(jobId: string, candidateSkills: string[]) {
  const params = new URLSearchParams()
  params.append('candidate_skills', candidateSkills.join(','))
  const res = await fetch(`${API_BASE}/jobs/${jobId}/match?${params.toString()}`)
  if (!res.ok) throw new Error('Unable to fetch job match')
  return await res.json()
}

export async function uploadResume(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/resume/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  })
  if (!res.ok) throw new Error('Failed to upload and analyze resume')
  return await res.json()
}

