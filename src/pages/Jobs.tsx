import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Search, Filter, MapPin, Clock, Bookmark, BookmarkCheck,
  ExternalLink, ChevronRight, SlidersHorizontal, ShieldCheck, AlertTriangle, XCircle, RefreshCw
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge, FitBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../stores/appStore'
import { timeAgo } from '../lib/utils'
import { toast } from 'sonner'

type JobItem = {
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
  source_name?: string
  source_url?: string
  first_seen_at?: string
  last_verified_at?: string
  verification_status?: 'verified_active' | 'needs_verification' | 'inactive' | 'expired'
  content_hash?: string
  verification_notes?: string
}

function VerificationBadge({ status }: { status?: JobItem['verification_status'] }) {
  if (!status || status === 'needs_verification') {
    return (
      <Badge variant="amber" size="sm">
        <AlertTriangle size={10} /> Needs Verification
      </Badge>
    )
  }
  if (status === 'verified_active') {
    return (
      <Badge variant="emerald" size="sm">
        <ShieldCheck size={10} /> Verified Active
      </Badge>
    )
  }
  if (status === 'inactive') {
    return (
      <Badge variant="rose" size="sm">
        <XCircle size={10} /> Inactive
      </Badge>
    )
  }
  if (status === 'expired') {
    return (
      <Badge variant="slate" size="sm">
        Expired
      </Badge>
    )
  }
  return null
}

function JobCard({ job, onSave, saved, onView, onVerify }: {
  job: JobItem
  saved: boolean
  onSave: () => void
  onView: () => void
  onVerify: () => void
}) {
  const verifiedTime = timeAgo(job.verified)
  
  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-bold text-white">{job.title}</p>
            <VerificationBadge status={job.verification_status} />
          </div>
          <p className="text-sm text-slate-400">{job.company}</p>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
            <MapPin size={11} />
            <span>{job.location}</span>
            <span>·</span>
            <span>{job.workMode}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <FitBadge score={job.fitScore} />
          <button onClick={onSave} className="text-slate-500 hover:text-indigo-400 transition-colors">
            {saved ? <BookmarkCheck size={16} className="text-indigo-400" /> : <Bookmark size={16} />}
          </button>
        </div>
      </div>

      {/* Fit score bar */}
      <div className="mb-3 space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-500">Fit Score</span>
          <span className="font-bold text-indigo-300">{job.fitScore}/100</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden bg-white/6">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
            initial={{ width: 0 }} animate={{ width: `${job.fitScore}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1 mb-3">
        {job.matchedSkills.slice(0, 4).map(s => (
          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">✓ {s}</span>
        ))}
        {job.missingSkills.slice(0, 2).map(s => (
          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/15">✗ {s}</span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600 flex items-center gap-1">
            <Clock size={10} /> Verified {verifiedTime}
          </span>
          {job.source_name && (
            <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-white/5">
              {job.source_name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onView}>
            View Match <ChevronRight size={12} />
          </Button>
          <Button size="sm" onClick={() => window.open(job.applyUrl, '_blank')}>
            <ExternalLink size={12} /> Apply
          </Button>
          {job.verification_status === 'needs_verification' && (
            <Button variant="ghost" size="sm" onClick={onVerify}>
              <RefreshCw size={12} /> Verify
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function Jobs() {
  const navigate = useNavigate()
  const { jobs, savedJobs, toggleSaveJob, fetchLiveJobs } = useAppStore()
  const [activeTab, setActiveTab] = useState<'all' | 'recommended' | 'saved' | 'verified' | 'applied'>('verified')
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [scoreFilter, setScoreFilter] = useState(0)
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified_active'>('all')
  const [collecting, setCollecting] = useState(false)
  const [fetchingLive, setFetchingLive] = useState(false)

  const tabs = [
    { key: 'verified', label: 'Verified Active', count: jobs.filter(j => j.verification_status === 'verified_active').length },
    { key: 'recommended', label: 'Recommended (≥80)', count: jobs.filter(j => j.fitScore >= 80).length },
    { key: 'all', label: 'All Jobs', count: jobs.length },
    { key: 'saved', label: 'Saved', count: savedJobs.length },
    { key: 'applied', label: 'Applied', count: jobs.filter(j => j.applied).length },
  ] as const

  const filtered = useMemo(() => {
    let result = jobs
    if (activeTab === 'verified') result = result.filter(j => j.verification_status === 'verified_active')
    if (activeTab === 'recommended') result = result.filter(j => j.fitScore >= 80)
    if (activeTab === 'saved') result = result.filter(j => savedJobs.includes(j.id))
    if (activeTab === 'applied') result = result.filter(j => j.applied)
    if (verificationFilter !== 'all') result = result.filter(j => j.verification_status === verificationFilter)
    if (search) result = result.filter(j =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase())
    )
    if (filterMode !== 'all') result = result.filter(j => j.workMode.toLowerCase() === filterMode)
    if (scoreFilter > 0) result = result.filter(j => j.fitScore >= scoreFilter)
    return result.sort((a, b) => b.fitScore - a.fitScore)
  }, [jobs, activeTab, search, filterMode, savedJobs, scoreFilter, verificationFilter])

  const handleVerify = async (jobId: string) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
      const res = await fetch(`${API_BASE}/jobs/verify/${jobId}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Verification: ${data.verification_status}`)
        fetchLiveJobs()
      } else {
        toast.error('Verification failed')
      }
    } catch {
      toast.error('Could not reach backend')
    }
  }

  const handleFetchLive = async () => {
    setFetchingLive(true)
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
      const res = await fetch(`${API_BASE}/jobs/fetch-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search: '' })
      })
      if (res.ok) {
        const data = await res.json()
        const sourcesStr = Object.entries(data.sources || {})
          .filter(([, count]) => (count as number) > 0)
          .map(([src, count]) => `${src} (${count})`)
          .join(', ')
        toast.success(`Fetched ${data.new ?? 0} new + ${data.updated ?? 0} updated jobs from ${sourcesStr || 'all sources'}`)
        fetchLiveJobs()
      } else {
        toast.error('Live fetch failed — check backend is running')
      }
    } catch {
      toast.error('Could not reach backend')
    } finally {
      setFetchingLive(false)
    }
  }

  const handleCollect = async () => {
    setCollecting(true)
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
      const res = await fetch(`${API_BASE}/jobs/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: ['company_careers'] })
      })
      if (res.ok) {
        toast.success('Job collection queued')
        fetchLiveJobs()
      } else {
        toast.error('Collection failed - run job_collector service')
      }
    } catch {
      toast.error('Could not reach backend')
    } finally {
      setCollecting(false)
    }
  }

  return (
    <motion.div className="p-4 md:p-6 max-w-6xl space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Jobs</h1>
          <p className="text-slate-400 text-sm">
            {jobs.length > 0 
              ? `${jobs.length} jobs in database · ${jobs.filter(j => j.verification_status === 'verified_active').length} verified active`
              : 'No job data — fetch live jobs to find verified opportunities'}
          </p>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          {fetchingLive && (
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <RefreshCw size={11} className="animate-spin" /> Fetching from Remotive, RemoteOK, Jobicy…
            </span>
          )}
          <Button onClick={handleFetchLive} disabled={fetchingLive}>
            <RefreshCw size={14} className={fetchingLive ? 'animate-spin' : ''} />
            {fetchingLive ? 'Fetching…' : 'Fetch Live Jobs'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-500/25 text-indigo-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}>
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === tab.key ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/6 text-slate-500'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search & filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs, companies, locations…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            showFilters ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'
          }`} style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <SlidersHorizontal size={14} />
          <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium">Verification Status</p>
              <div className="flex gap-2 flex-wrap">
                {['all', 'verified_active'].map(m => (
                  <button key={m} onClick={() => setVerificationFilter(m as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                      verificationFilter === m
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white/5 text-slate-400 border border-white/8 hover:bg-white/8'
                    }`}>
                    {m === 'all' ? 'All' : m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium">Work Mode</p>
              <div className="flex gap-2 flex-wrap">
                {['all', 'remote', 'hybrid', 'onsite'].map(m => (
                  <button key={m} onClick={() => setFilterMode(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                      filterMode === m
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-white/5 text-slate-400 border border-white/8 hover:bg-white/8'
                    }`}>{m}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium">Min Fit Score: {scoreFilter > 0 ? `${scoreFilter}+` : 'Any'}</p>
              <div className="flex gap-2 flex-wrap">
                {[0, 60, 75, 90].map(s => (
                  <button key={s} onClick={() => setScoreFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      scoreFilter === s
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-white/5 text-slate-400 border border-white/8 hover:bg-white/8'
                    }`}>{s === 0 ? 'Any' : `${s}+`}</button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Results count */}
      <p className="text-xs text-slate-500">{filtered.length} jobs · sorted by fit score</p>

      {/* Job grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-slate-300 font-medium mb-1">No verified matches found</p>
          <p className="text-slate-500 text-sm mb-4">
            {jobs.length === 0 
              ? 'Fetch live jobs to populate the database with verified opportunities.'
              : 'Try expanding your filters or fetch live jobs for fresh listings.'}
          </p>
          <Button onClick={handleFetchLive} disabled={fetchingLive} className="mt-2">
            <RefreshCw size={14} className={fetchingLive ? 'animate-spin' : ''} />
            {fetchingLive ? 'Fetching…' : 'Fetch Live Jobs'}
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(job => (
            <JobCard
              key={job.id}
              job={job}
              saved={savedJobs.includes(job.id)}
              onSave={() => toggleSaveJob(job.id)}
              onView={() => navigate(`/jobs/${job.id}`)}
              onVerify={() => handleVerify(job.id)}
            />
          ))}
        </div>
      )}

      {/* Source attribution */}
      <div className="pt-6 border-t border-white/5 text-center">
        <p className="text-xs text-slate-600">
          Jobs sourced from{' '}
          <a href="https://remotive.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-400 transition-colors">Remotive</a>
          {' · '}
          <a href="https://remoteok.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-400 transition-colors">RemoteOK</a>
          {' · '}
          <a href="https://jobicy.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-400 transition-colors">Jobicy</a>
          {' · '}
          <span className="text-slate-600">Updated live</span>
        </p>
      </div>
    </motion.div>
  )
}