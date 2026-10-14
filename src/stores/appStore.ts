import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SkillItem {
  name: string
  level: string
  category: string
  evidence?: string
  evidence_source?: 'resume' | 'user_input' | 'github' | 'linkedin' | 'portfolio' | 'inferred'
  confidence_score?: number
}

export interface GapItem {
  name: string
  candidateLevel: string
  marketDemand: string
  opportunity_score: number
  priority: string
  why: string
  evidence?: Record<string, any>
  recommendation?: string
  estimated_effort_weeks?: number
}

export interface TargetRole {
  id: number
  title: string
  fit: number
  whyThis: string
  strengths: string[]
  missing: string[]
  marketDemand: string
  jobCount: number
  nextStep: string
}

export interface JobItem {
  id: string
  title: string
  company: string
  location: string
  workMode: string
  fitScore: number
  posted: Date
  verified: Date
  matchedSkills: string[]
  partialSkills: string[]
  missingSkills: string[]
  applyUrl: string
  saved: boolean
  applied: boolean
  source: string
  description: string
  requirements: string[]
  // Provenance
  source_name?: string
  source_url?: string
  first_seen_at?: string
  last_verified_at?: string
  verification_status?: 'verified_active' | 'needs_verification' | 'inactive' | 'expired'
  content_hash?: string
  verification_notes?: string
}

export interface MarketSkillItem {
  name: string
  demand: number
  jobs: number
  trend: 'rising' | 'stable' | 'emerging' | 'declining'
  category?: string
  source?: string
  source_url?: string
  period_start?: string
  period_end?: string
  calculated_at?: string
}

export interface ApplicationItem {
  jobId: string
  title: string
  company: string
  status: string
  appliedAt: Date
}

export interface Profile {
  name: string
  email: string
  location: string
  education: string
  graduation: string
  experienceLevel: string
  careerReadiness: number
  marketFit: number
  skillStrength: number
  resumeScore: number
  seniority: string
}

export interface ResumeVersion {
  id: string
  name: string
  createdAt: string
  matchScore: number | null
  isOriginal: boolean
  parsedData?: Record<string, unknown>
}

export interface Notification {
  id: string
  type: 'job' | 'skill' | 'market' | 'plan' | 'system'
  title: string
  message: string
  read: boolean
  createdAt: string
  actionUrl?: string
}

export interface UserSettings {
  theme: 'dark' | 'light'
  notifications: {
    newJobMatches: boolean
    marketUpdates: boolean
    skillGapAlerts: boolean
    actionPlanReminders: boolean
  }
  preferredLocations: string[]
  jobType: string
  experienceLevel: string
  domains: string[]
  careerGoal: string
}

export interface ResumeAnalysis {
  overallScore: number
  breakdown: Record<string, number>
  strengths: string[]
  improvements: Array<{ level: string; text: string }>
  extractedProfile: {
    name: string
    email: string
    targetRole: string
    experienceLevel: string
    readinessScore: number
    skills: Array<{ name: string; level: string; category: string; evidence?: string }>
    summary?: string
  }
}

export interface AnalyticsState {
  totalApplied: number
  totalSaved: number
  totalInterviews: number
  totalOffers: number
  avgFitScore: number
  careerReadinessTrend: Array<{ date: string; score: number }>
  skillsAddedCount: number
  topAppliedRole: string
}

// ─── Default values ────────────────────────────────────────────────────────────

const defaultSettings: UserSettings = {
  theme: 'dark',
  notifications: {
    newJobMatches: true,
    marketUpdates: true,
    skillGapAlerts: true,
    actionPlanReminders: false,
  },
  preferredLocations: [],
  jobType: 'Both',
  experienceLevel: 'Fresher',
  domains: [],
  careerGoal: '',
}

const defaultNotifications: Notification[] = []
const defaultResumeVersions: ResumeVersion[] = []
const defaultAnalytics: AnalyticsState = {
  totalApplied: 0,
  totalSaved: 0,
  totalInterviews: 0,
  totalOffers: 0,
  avgFitScore: 0,
  careerReadinessTrend: [],
  skillsAddedCount: 0,
  topAppliedRole: '',
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface AppState {
  // Auth
  authUser: { id: string; email: string } | null
  authLoading: boolean
  setAuthUser: (user: { id: string; email: string } | null) => void
  setAuthLoading: (v: boolean) => void
  signOut: () => Promise<void>

  // Core
  hasResume: boolean
  profile: Profile | null
  skills: SkillItem[]
  gaps: GapItem[]
  targetRoles: TargetRole[]
  jobs: JobItem[]
  marketSkills: MarketSkillItem[]
  applications: ApplicationItem[]

  // Real API analysis result
  resumeAnalysis: ResumeAnalysis | null

  // Resume versioning
  resumeVersions: ResumeVersion[]

  // Notifications
  notifications: Notification[]

  // User settings
  userSettings: UserSettings

  // Analytics
  analytics: AnalyticsState

  // UI
  sidebarCollapsed: boolean
  onboardingComplete: boolean
  savedJobs: string[]

  // Actions — core
  setHasResume: (v: boolean, analysis?: ResumeAnalysis) => void
  setSidebarCollapsed: (v: boolean) => void
  setOnboardingComplete: (v: boolean) => void
  toggleSaveJob: (jobId: string) => void
  setProfile: (profile: Profile) => void
  setSkills: (skills: SkillItem[]) => void
  setGaps: (gaps: GapItem[]) => void
  setTargetRoles: (roles: TargetRole[]) => void
  setJobs: (jobs: JobItem[]) => void
  setMarketSkills: (skills: MarketSkillItem[]) => void
  setApplications: (apps: ApplicationItem[]) => void

  // Actions — notifications
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  addNotification: (n: Omit<Notification, 'id' | 'createdAt'>) => void

  // Actions — resume versions
  addResumeVersion: (version: Omit<ResumeVersion, 'id'>) => void
  deleteResumeVersion: (id: string) => void

  // Actions — settings
  updateSettings: (patch: Partial<UserSettings>) => void
  updateNotificationSetting: (key: keyof UserSettings['notifications'], value: boolean) => void

  // Actions — analytics
  recordApplication: () => void
  recordInterview: () => void
  recordOffer: () => void

  // Actions — live data
  fetchLiveJobs: (candidateSkills?: string[]) => Promise<void>
  fetchLiveMarket: () => Promise<void>
  runCareerAnalysis: () => Promise<void>
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      authUser: null,
      authLoading: true,
      hasResume: false,
      profile: null,
      skills: [],
      gaps: [],
      targetRoles: [],
      jobs: [],
      marketSkills: [],
      applications: [],
      resumeAnalysis: null,
      resumeVersions: defaultResumeVersions,
      notifications: defaultNotifications,
      userSettings: defaultSettings,
      analytics: defaultAnalytics,
      sidebarCollapsed: false,
      onboardingComplete: false,
      savedJobs: [],

      // ── Auth ──────────────────────────────────────────────────────────────
      setAuthUser: (user) => set({ authUser: user }),
      setAuthLoading: (v) => set({ authLoading: v }),
      signOut: async () => {
        const { supabase } = await import('../lib/supabase')
        await supabase.auth.signOut()
        set({
          authUser: null,
          profile: null,
          skills: [],
          gaps: [],
          targetRoles: [],
          resumeAnalysis: null,
          hasResume: false,
        })
      },

      // ── Core ──────────────────────────────────────────────────────────────
      setHasResume: (v, analysis) => {
        const updates: Partial<AppState> = { hasResume: v }

        if (!v) {
          updates.profile = null
          updates.skills = []
          updates.gaps = []
          updates.targetRoles = []
          set(updates)
          return
        }

        if (analysis?.extractedProfile) {
          const ep = analysis.extractedProfile
          updates.profile = {
            name: ep.name || 'Candidate',
            email: ep.email || '',
            location: '',
            education: '',
            graduation: '',
            experienceLevel: ep.experienceLevel || 'Entry-level',
            careerReadiness: analysis.overallScore,
            marketFit: analysis.breakdown?.['Market Alignment'] ?? 0,
            skillStrength: analysis.breakdown?.['Technical Skills'] ?? 0,
            resumeScore: analysis.breakdown?.['Resume Quality'] ?? 0,
            seniority: ep.experienceLevel || 'Entry-level',
          }
          if (ep.skills?.length) {
            updates.skills = ep.skills.map((s: any) => ({
              name: s.name,
              level: s.level || 'Intermediate',
              category: s.category || 'Technical',
              evidence: s.evidence || '',
              evidence_source: 'resume',
              confidence_score: 1.0,
            }))
          }
        }

        updates.resumeAnalysis = analysis ?? null

        const existingVersions = get().resumeVersions
        const alreadyHasReal = existingVersions.some(rv => !rv.isOriginal)
        if (analysis && !alreadyHasReal) {
          updates.resumeVersions = [
            ...existingVersions,
            {
              id: `rv-${Date.now()}`,
              name: 'Resume — Analyzed',
              createdAt: new Date().toISOString(),
              matchScore: analysis.overallScore,
              isOriginal: false,
              parsedData: analysis as unknown as Record<string, unknown>,
            },
          ]
        }

        set(updates)
      },

      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setOnboardingComplete: (v) => set({ onboardingComplete: v }),

      toggleSaveJob: (jobId) => set((state) => ({
        savedJobs: state.savedJobs.includes(jobId)
          ? state.savedJobs.filter(id => id !== jobId)
          : [...state.savedJobs, jobId],
      })),

      setProfile: (profile) => set({ profile }),
      setSkills: (skills) => set({ skills }),
      setGaps: (gaps) => set({ gaps }),
      setTargetRoles: (targetRoles) => set({ targetRoles }),
      setJobs: (jobs) => set({ jobs }),
      setMarketSkills: (marketSkills) => set({ marketSkills }),
      setApplications: (applications) => set({ applications }),

      // ── Notifications ──────────────────────────────────────────────────────
      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      })),

      markAllNotificationsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      })),

      addNotification: (n) => set((state) => ({
        notifications: [
          {
            ...n,
            id: `n-${Date.now()}`,
            createdAt: new Date().toISOString(),
          },
          ...state.notifications,
        ],
      })),

      // ── Resume Versions ────────────────────────────────────────────────────
      addResumeVersion: (version) => set((state) => ({
        resumeVersions: [
          ...state.resumeVersions,
          { ...version, id: `rv-${Date.now()}` },
        ],
      })),

      deleteResumeVersion: (id) => set((state) => ({
        resumeVersions: state.resumeVersions.filter(v => v.id !== id),
      })),

      // ── Settings ───────────────────────────────────────────────────────────
      updateSettings: (patch) => set((state) => ({
        userSettings: { ...state.userSettings, ...patch },
      })),

      updateNotificationSetting: (key, value) => set((state) => ({
        userSettings: {
          ...state.userSettings,
          notifications: { ...state.userSettings.notifications, [key]: value },
        },
      })),

      // ── Analytics ──────────────────────────────────────────────────────────
      recordApplication: () => set((state) => ({
        analytics: { ...state.analytics, totalApplied: state.analytics.totalApplied + 1 },
      })),

      recordInterview: () => set((state) => ({
        analytics: { ...state.analytics, totalInterviews: state.analytics.totalInterviews + 1 },
      })),

      recordOffer: () => set((state) => ({
        analytics: { ...state.analytics, totalOffers: state.analytics.totalOffers + 1 },
      })),

      // ── Live data fetchers ─────────────────────────────────────────────────
      fetchLiveJobs: async (candidateSkills) => {
        try {
          const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
          const params = new URLSearchParams()
          if (candidateSkills?.length) {
            params.set('candidate_skills', candidateSkills.join(','))
          }
          const res = await fetch(`${API_BASE}/jobs?${params.toString()}`)
          if (!res.ok) {
            console.warn('Failed to fetch jobs:', res.status)
            return
          }
          const data = await res.json()
          if (Array.isArray(data)) {
            const mapped = data.map((j: any) => ({
              id: j.id,
              title: j.title,
              company: j.company,
              location: j.location || '',
              workMode: j.workMode || j.work_mode || 'Not specified',
              fitScore: j.fitScore ?? j.fit_score ?? 0,
              posted: j.postedDate ? new Date(j.postedDate) : (j.posted_date ? new Date(j.posted_date) : new Date()),
              verified: j.first_seen_at && new Date(j.first_seen_at) < new Date(j.last_verified_at ?? j.first_seen_at) ? new Date(j.first_seen_at) : (j.last_verified_at ? new Date(j.last_verified_at) : new Date()),
              matchedSkills: j.matchedSkills ?? j.matched_skills ?? [],
              partialSkills: j.partialSkills ?? j.partial_skills ?? [],
              missingSkills: j.missingSkills ?? j.missing_skills ?? [],
              applyUrl: j.applyUrl ?? j.apply_url ?? '#',
              saved: false,
              applied: false,
              source: j.source ?? '',
              description: j.description ?? '',
              requirements: j.missingSkills ?? j.missing_skills ?? [],
              source_name: j.source_name,
              source_url: j.source_url,
              first_seen_at: j.first_seen_at,
              last_verified_at: j.last_verified_at,
              verification_status: j.verification_status,
              content_hash: j.content_hash,
              verification_notes: j.verification_notes,
            }))
            set({ jobs: mapped })
          }
        } catch (e) {
          console.error('fetchLiveJobs error:', e)
        }
      },

      fetchLiveMarket: async () => {
        try {
          const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
          const res = await fetch(`${API_BASE}/market/skills`)
          if (!res.ok) {
            console.warn('Failed to fetch market skills:', res.status)
            return
          }
          const data = await res.json()
          if (Array.isArray(data)) {
            const mapped = data.map((s: any) => ({
              name: s.name,
              demand: s.demandPct ?? s.demand_score ?? 0,
              jobs: s.openingsCount ?? s.job_count ?? 0,
              trend: s.trend ?? 'stable',
              category: s.category,
              source: s.source,
              source_url: s.source_url,
              period_start: s.period_start,
              period_end: s.period_end,
              calculated_at: s.calculated_at,
            }))
            set({ marketSkills: mapped })
          }
        } catch (e) {
          console.error('fetchLiveMarket error:', e)
        }
      },

      runCareerAnalysis: async () => {
        const state = get()
        const resumeAnalysis = state.resumeAnalysis
        const marketSkills = state.marketSkills

        if (!resumeAnalysis?.extractedProfile?.skills?.length) return

        try {
          const { analyzeCareer } = await import('../lib/api')
          const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
          const candidateSkills = resumeAnalysis.extractedProfile.skills.map((s: any) => s.name)
          const marketSkillMap: Record<string, number> = {}
          marketSkills.forEach(s => { marketSkillMap[s.name] = s.demand })

          // Fetch top job requirements from DB to compute gaps against real postings
          const jobsRes = await fetch(`${API_BASE}/jobs?candidate_skills=${candidateSkills.join(',')}`)
          const jobs = jobsRes.ok ? await jobsRes.json() : []
          const topRequirements: string[] = []
          jobs.slice(0, 10).forEach((j: any) => {
            ;(j.missingSkills ?? []).forEach((s: string) => {
              if (!topRequirements.includes(s)) topRequirements.push(s)
            })
          })

          const result = await analyzeCareer({
            targetRole: resumeAnalysis.extractedProfile.targetRole || 'Software Engineer',
            candidateSkills,
            jobRequirements: topRequirements,
            marketSkills: marketSkillMap,
            candidateExperience: resumeAnalysis.extractedProfile.experienceLevel,
          })

          // Map gaps from backend
          const gaps: GapItem[] = result.gaps.map((g: any) => ({
            name: g.name,
            candidateLevel: g.candidateLevel ?? 'Missing',
            marketDemand: g.marketDemand ?? 'Unknown',
            opportunity_score: g.opportunityScore ?? 0,
            priority: g.priority ?? 'Medium',
            why: g.why ?? '',
            evidence: g.evidence ?? {},
            recommendation: g.recommendation,
            estimated_effort_weeks: g.estimated_effort_weeks,
          }))

          // Build target roles from readiness breakdown
          const readiness = result.career_readiness
          const targetRoles: TargetRole[] = [
            {
              id: 1,
              title: resumeAnalysis.extractedProfile.targetRole || 'Software Engineer',
              fit: result.fit.score,
              whyThis: `Your skills match ${result.fit.matchedSkills.length} of the required skills for this role.`,
              strengths: result.fit.matchedSkills.slice(0, 5),
              missing: result.fit.missingSkills.slice(0, 5),
              marketDemand: 'High',
              jobCount: jobs.length,
              nextStep: gaps[0] ? `Build skill in ${gaps[0].name}` : 'Apply to matching jobs',
            },
          ]

          set({ gaps, targetRoles })
        } catch (e) {
          console.error('runCareerAnalysis error:', e)
        }
      },
    }),
    {
      name: 'careerlens-store',
      partialize: (state) => ({
        savedJobs: state.savedJobs,
        userSettings: state.userSettings,
        resumeVersions: state.resumeVersions,
        onboardingComplete: state.onboardingComplete,
        hasResume: state.hasResume,
        analytics: state.analytics,
        notifications: state.notifications,
      }),
    }
  )
)