/**
 * Supabase data access helpers
 * NO FALLBACK TO MOCK DATA - returns empty results if database is unavailable.
 * All data includes provenance fields for traceability.
 */
import { supabase } from './supabase'

// ─── Market Skills ────────────────────────────────────────────────────────────

export interface MarketSkillRow {
  skill: string
  job_count: number
  demand_score: number
  trend: string
  roles: string[] | null
  locations: string[] | null
  category: string | null
}

export async function fetchMarketSkillsFromDB(): Promise<MarketSkillRow[]> {
  const { data, error } = await supabase
    .from('market_skills')
    .select('skill, job_count, demand_score, trend, roles, locations, category')
    .order('demand_score', { ascending: false })

  if (error) {
    console.error('Supabase market_skills query error:', error)
    return []
  }
  
  if (!data || data.length === 0) {
    console.warn('market_skills table empty - no real data available')
    return []
  }
  
  return data as MarketSkillRow[]
}

// ─── Market Statistics with Provenance ───────────────────────────────────────

export interface MarketStatisticRow {
  skill: string
  role: string | null
  location: string | null
  job_count: number
  total_jobs_analyzed: number
  demand_pct: number | null
  source: string
  source_url: string | null
  period_start: string
  period_end: string
  calculated_at: string
}

export async function fetchMarketStatistics(skill?: string): Promise<MarketStatisticRow[]> {
  let q = supabase
    .from('market_statistics')
    .select('*')
    .order('calculated_at', { ascending: false })

  if (skill) {
    q = q.eq('skill', skill)
  }

  const { data, error } = await q

  if (error) {
    console.error('Supabase market_statistics query error:', error)
    return []
  }
  
  return data as MarketStatisticRow[]
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export interface JobRow {
  id: string
  title: string
  company: string
  location: string | null
  salary: string | null
  description: string | null
  requirements: string[] | null
  apply_url: string | null
  posted_date: string | null
  verified_at: string
  status: string
  work_mode: string | null
  experience_required: string | null
  source: string | null
  source_name: string | null
  source_url: string | null
  first_seen_at: string | null
  last_verified_at: string | null
  verification_status: string
  content_hash: string | null
  verification_notes: string | null
}

export async function fetchJobsFromDB(
  query?: string, 
  workMode?: string,
  verificationStatus?: string
): Promise<JobRow[]> {
  let q = supabase
    .from('jobs')
    .select('*, source_name, source_url, first_seen_at, last_verified_at, verification_status, content_hash, verification_notes')
    .eq('status', 'active')
    .order('posted_date', { ascending: false })

  if (workMode && workMode !== 'all') {
    q = q.ilike('work_mode', workMode)
  }

  if (verificationStatus) {
    q = q.eq('verification_status', verificationStatus)
  }

  const { data, error } = await q

  if (error) {
    console.error('Supabase jobs query error:', error)
    return []
  }

  if (!data || data.length === 0) {
    console.warn('jobs table empty - no real job data available')
    return []
  }

  // Client-side filter for text search
  let result = data as JobRow[]
  if (query) {
    const lower = query.toLowerCase()
    result = result.filter(j =>
      j.title.toLowerCase().includes(lower) ||
      j.company.toLowerCase().includes(lower) ||
      (j.location ?? '').toLowerCase().includes(lower)
    )
  }
  return result
}

// ─── Collection Log ──────────────────────────────────────────────────────────

export interface CollectionLogRow {
  source: string
  source_url: string | null
  jobs_found: number
  jobs_new: number
  jobs_updated: number
  jobs_failed: number
  status: string
  started_at: string
  completed_at: string | null
}

export async function fetchCollectionLog(limit = 10): Promise<CollectionLogRow[]> {
  const { data, error } = await supabase
    .from('data_collection_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Supabase collection_log query error:', error)
    return []
  }
  
  return data as CollectionLogRow[]
}