/**
 * Supabase Client Configuration
 * Frontend database client for CareerLens AI
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Using mock data.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

// Database table types (for TypeScript autocomplete)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          location: string | null
          target_country: string
          preferred_locations: string[]
          experience_level: string
          job_type: string
          preferred_domains: string[]
          career_goal: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          location?: string | null
          target_country?: string
          preferred_locations?: string[]
          experience_level?: string
          job_type?: string
          preferred_domains?: string[]
          career_goal?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          location?: string | null
          target_country?: string
          preferred_locations?: string[]
          experience_level?: string
          job_type?: string
          preferred_domains?: string[]
          career_goal?: string | null
          updated_at?: string
        }
      }
      resumes: {
        Row: {
          id: string
          user_id: string
          file_url: string | null
          file_name: string | null
          version: number
          parsed_data: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_url?: string | null
          file_name?: string | null
          version?: number
          parsed_data?: any
          created_at?: string
        }
        Update: {
          file_url?: string | null
          file_name?: string | null
          version?: number
          parsed_data?: any
        }
      }
      skills: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string | null
          candidate_level: string
          evidence: string | null
          years_of_experience: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category?: string | null
          candidate_level?: string
          evidence?: string | null
          years_of_experience?: number
          created_at?: string
        }
        Update: {
          name?: string
          category?: string | null
          candidate_level?: string
          evidence?: string | null
          years_of_experience?: number
        }
      }
      jobs: {
        Row: {
          id: string
          title: string
          company: string
          location: string | null
          salary: string | null
          description: string | null
          requirements: string[] | null
          source_url: string | null
          apply_url: string | null
          posted_date: string | null
          verified_at: string
          status: string
          work_mode: string | null
          experience_required: string | null
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          company: string
          location?: string | null
          salary?: string | null
          description?: string | null
          requirements?: string[] | null
          source_url?: string | null
          apply_url?: string | null
          posted_date?: string | null
          verified_at?: string
          status?: string
          work_mode?: string | null
          experience_required?: string | null
          source?: string | null
          created_at?: string
        }
        Update: {
          title?: string
          company?: string
          location?: string | null
          salary?: string | null
          description?: string | null
          requirements?: string[] | null
          source_url?: string | null
          apply_url?: string | null
          posted_date?: string | null
          verified_at?: string
          status?: string
          work_mode?: string | null
          experience_required?: string | null
          source?: string | null
        }
      }
      job_matches: {
        Row: {
          id: string
          job_id: string
          user_id: string
          fit_score: number | null
          matched_skills: string[] | null
          missing_skills: string[] | null
          partial_skills: string[] | null
          explanation: any
          breakdown: any
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          user_id: string
          fit_score?: number | null
          matched_skills?: string[] | null
          missing_skills?: string[] | null
          partial_skills?: string[] | null
          explanation?: any
          breakdown?: any
          created_at?: string
        }
        Update: {
          fit_score?: number | null
          matched_skills?: string[] | null
          missing_skills?: string[] | null
          partial_skills?: string[] | null
          explanation?: any
          breakdown?: any
        }
      }
      market_skills: {
        Row: {
          id: string
          skill: string
          job_count: number
          demand_score: number
          trend: string
          roles: string[] | null
          locations: string[] | null
          category: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          skill: string
          job_count?: number
          demand_score?: number
          trend?: string
          roles?: string[] | null
          locations?: string[] | null
          category?: string | null
          updated_at?: string
        }
        Update: {
          job_count?: number
          demand_score?: number
          trend?: string
          roles?: string[] | null
          locations?: string[] | null
          category?: string | null
          updated_at?: string
        }
      }
      applications: {
        Row: {
          id: string
          job_id: string
          user_id: string
          status: string
          notes: string | null
          applied_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          user_id: string
          status?: string
          notes?: string | null
          applied_at?: string | null
          created_at?: string
        }
        Update: {
          status?: string
          notes?: string | null
          applied_at?: string | null
        }
      }
    }
  }
}
