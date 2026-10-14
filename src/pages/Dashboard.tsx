import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Zap, Briefcase, Flame, Target,
  Activity, ChevronRight, CheckCircle2, FileText, BarChart3, Loader2
} from 'lucide-react'
import { Card, CardTitle } from '../components/ui/Card'
import { ScoreRing, ProgressBar } from '../components/ui/ScoreRing'
import { Button } from '../components/ui/Button'
import { Badge, FitBadge } from '../components/ui/Badge'
import { useAppStore } from '../stores/appStore'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const {
    profile, gaps, targetRoles, jobs, marketSkills,
    resumeAnalysis, fetchLiveJobs, fetchLiveMarket, runCareerAnalysis
  } = useAppStore()
  const [loading, setLoading] = useState(true)

  // Fetch live data when dashboard mounts, then run career analysis
  useEffect(() => {
    const skills = resumeAnalysis?.extractedProfile?.skills?.map((s: any) => s.name) ?? []
    Promise.all([fetchLiveJobs(skills), fetchLiveMarket()]).then((results) => {
      if (resumeAnalysis) runCareerAnalysis()
      // Auto-fetch live jobs in background if DB is empty after the initial load
      const currentJobs = useAppStore.getState().jobs
      if (currentJobs.length === 0) {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
        fetch(`${API_BASE}/jobs/fetch-live`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ search: '' })
        })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.total_fetched > 0) {
              // Refresh from store after background fetch completes
              fetchLiveJobs(skills)
            }
          })
          .catch(() => { /* silent background fetch — ignore errors */ })
      }
      setLoading(false)
    })
  }, [resumeAnalysis])

  // Derive score breakdown from real analysis only
  const breakdown = resumeAnalysis?.breakdown ?? {}
  const scoreBreakdown = [
    { label: 'Technical Skills',  value: breakdown['Technical Skills']  ?? 0, color: '#6366f1' },
    { label: 'Project Strength',  value: breakdown['Project Strength']  ?? 0, color: '#8b5cf6' },
    { label: 'Experience',        value: breakdown['Experience']         ?? 0, color: '#06b6d4' },
    { label: 'Market Alignment',  value: breakdown['Market Alignment']  ?? 0, color: '#10b981' },
  ]
  const careerReadiness = profile?.careerReadiness ?? resumeAnalysis?.overallScore ?? 0

  // Top 3 jobs by fit score
  const topJobs = [...jobs].sort((a, b) => b.fitScore - a.fitScore).slice(0, 3)

  // Market pulse from live data
  const marketPulse = marketSkills.slice(0, 6).map(s => ({
    skill: s.name,
    trend: s.trend === 'rising' || s.trend === 'emerging' ? 'rising' : 'stable',
    delta: s.trend === 'rising' ? '↑' : s.trend === 'emerging' ? '↑ New' : '→',
  }))

  // Top skill gap for the alert
  const topGap = gaps[0]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  )

  return (
    <motion.div className="p-4 md:p-6 space-y-6 max-w-7xl"
      variants={container} initial="hidden" animate="show">

      {/* Greeting */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            {greeting()}{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">Here's your career intelligence for today</p>
        </div>
        <Button size="sm" onClick={() => navigate('/jobs')}>
          <Briefcase size={14} /> Find Jobs
        </Button>
      </motion.div>

      {/* Top stats row */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Career Readiness */}
        <Card className="lg:col-span-1 p-6 flex flex-col items-center text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Career Readiness</p>
          {resumeAnalysis ? (
            <>
              <ScoreRing score={careerReadiness} size={140} strokeWidth={10} color="#6366f1" />
              <div className="mt-4 w-full space-y-2.5">
                {scoreBreakdown.map(s => (
                  <ProgressBar key={s.label} label={s.label} value={s.value} color={s.color} />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="w-32 h-32 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mb-4">
                <FileText size={28} className="text-slate-600" />
              </div>
              <p className="text-sm text-slate-500 mb-1">No resume uploaded</p>
              <p className="text-xs text-slate-600">Your readiness score will appear here after analysis</p>
            </div>
          )}
          <Button variant="ghost" size="sm" className="mt-4 text-indigo-400" onClick={() => navigate('/resume')}>
            {resumeAnalysis ? 'Full Analysis' : 'Upload Resume'} <ChevronRight size={14} />
          </Button>
        </Card>

        {/* Target Roles → only shown when real data exists */}
        <Card className="lg:col-span-1 p-5">
          <CardTitle className="mb-4">Best Target Roles</CardTitle>
          {targetRoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText size={28} className="text-slate-600 mb-3" />
              <p className="text-sm text-slate-500 mb-1">No target roles yet</p>
              <p className="text-xs text-slate-600 mb-4">Upload your resume to identify the best roles for you</p>
              <Button size="sm" variant="secondary" onClick={() => navigate('/resume')}>Upload Resume</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {targetRoles.map((role, i) => (
                <motion.div key={role.id} whileHover={{ x: 2 }}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-white/4"
                  onClick={() => navigate('/skill-gap')}>
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{role.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 rounded-full overflow-hidden bg-white/6">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                          style={{ width: `${role.fit}%` }} />
                      </div>
                      <span className="text-xs text-indigo-300 font-bold shrink-0">{role.fit}%</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-600 shrink-0" />
                </motion.div>
              ))}
              <Button variant="secondary" size="sm" className="w-full mt-2" onClick={() => navigate('/skill-gap')}>
                View Skill Gaps
              </Button>
            </div>
          )}
        </Card>

        {/* Market Pulse */}
        <Card className="lg:col-span-1 p-5">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Market Pulse</CardTitle>
            <Badge variant="cyan" className="text-[10px]">LIVE</Badge>
          </div>
          <div className="space-y-2.5">
            {marketPulse.map(p => (
              <div key={p.skill} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/4 transition-colors">
                <div className="flex items-center gap-2">
                  <Activity size={13} className={p.trend === 'rising' ? 'text-emerald-400' : 'text-slate-500'} />
                  <span className="text-sm text-slate-200">{p.skill}</span>
                </div>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  p.trend === 'rising'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-slate-500/15 text-slate-400'
                }`}>{p.delta}</span>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="w-full mt-4" onClick={() => navigate('/market')}>
            Full Market Intelligence
          </Button>
        </Card>
      </motion.div>

      {/* Skill gap alert */}
      {topGap && (
        <motion.div variants={item}>
          <Card className="p-5" style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <Flame size={20} className="text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-white">Market Opportunity Alert</h3>
                  <Badge variant="amber">High Priority</Badge>
                </div>
                <p className="text-sm text-slate-400 mb-3">
                  <strong className="text-amber-300">{topGap.name}</strong> is your #1 skill opportunity.
                  Market demand is <strong className="text-white">{topGap.marketDemand}</strong> and it's currently missing from your profile.
                  Opportunity score: <strong className="text-white">{topGap.opportunity_score}/100</strong>
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => navigate('/skill-gap')}>
                    <Zap size={14} /> Build Skill Plan
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate('/jobs')}>
                    Find Jobs
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Top jobs */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Target size={16} className="text-indigo-400" />
            Top Opportunities
            <span className="text-xs text-slate-500 font-normal ml-1">{jobs.length} found</span>
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')}>
            View All <ChevronRight size={14} />
          </Button>
        </div>
        {topJobs.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-400 text-sm mb-3">No jobs loaded yet.</p>
            <p className="text-slate-500 text-xs mb-4">Run job collection to find verified opportunities</p>
            <Button variant="secondary" size="sm" onClick={() => navigate('/jobs')}>
              Go to Jobs
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {topJobs.map(job => (
              <Card key={job.id} hover className="p-4" onClick={() => navigate(`/jobs/${job.id}`)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-white">{job.title}</p>
                    <p className="text-xs text-slate-400">{job.company}</p>
                  </div>
                  <FitBadge score={job.fitScore} />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                  <span>{job.location}</span>
                  <span>·</span>
                  <span>{job.workMode}</span>
                </div>
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Fit Score</span>
                    <span className="font-bold text-indigo-300">{job.fitScore}/100</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-white/6">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                      style={{ width: `${job.fitScore}%` }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {job.matchedSkills.slice(0, 3).map(s => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      {/* Quick stats */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
{[
          { label: 'Skill Gaps',   value: gaps.length > 0 ? String(gaps.length) : '—', sub: gaps.length > 0 ? 'identified' : 'no data', icon: Zap,           color: '#f59e0b', path: '/skill-gap' },
          { label: 'Jobs Found',   value: jobs.length > 0 ? `${jobs.length}` : '—', sub: jobs.length > 0 ? 'verified' : 'run collection', icon: Briefcase,     color: '#10b981', path: '/jobs'      },
          { label: 'Market Fit',   value: profile?.marketFit ? `${profile.marketFit}%` : '—', sub: profile?.marketFit ? 'score' : 'no data', icon: TrendingUp,    color: '#6366f1', path: '/market'    },
          { label: 'Apply First',  value: jobs.length > 0 ? String(jobs.filter(j => j.fitScore >= 90).length) : '—', sub: jobs.length > 0 ? 'high fit' : 'no data', icon: CheckCircle2, color: '#06b6d4', path: '/jobs' },
        ].map(s => (
          <Card key={s.label} hover className="p-4" onClick={() => navigate(s.path)}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${s.color}18` }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-bold text-white font-display">{s.value}</p>
                <p className="text-[11px] text-slate-500">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </motion.div>
    </motion.div>
  )
}
