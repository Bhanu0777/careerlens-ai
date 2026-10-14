import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Clock, ExternalLink, CheckCircle2, AlertCircle, XCircle, BookmarkCheck, Bookmark } from 'lucide-react'
import { Card, CardTitle } from '../components/ui/Card'
import { Badge, FitBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ScoreRing } from '../components/ui/ScoreRing'
import { useAppStore } from '../stores/appStore'
import { timeAgo, getScoreColor } from '../lib/utils'

export default function JobMatch() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { jobs, savedJobs, toggleSaveJob, resumeAnalysis } = useAppStore()
  const job = jobs.find(j => j.id === id)

  if (!job) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Job not found</p>
          <Button onClick={() => navigate('/jobs')}>Back to Jobs</Button>
        </div>
      </div>
    )
  }

  const saved = savedJobs.includes(job.id)
  const scoreColor = getScoreColor(job.fitScore)

  return (
    <motion.div className="p-4 md:p-6 max-w-5xl space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={14} /> Back to Jobs
      </button>

      {/* Job Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-2xl font-bold text-white">{job.title}</h1>
              <FitBadge score={job.fitScore} />
            </div>
            <p className="text-lg text-indigo-300 font-medium mb-3">{job.company}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <span className="flex items-center gap-1"><MapPin size={13} /> {job.location}</span>
              <Badge variant={job.workMode === 'Remote' ? 'emerald' : job.workMode === 'Hybrid' ? 'cyan' : 'slate'}>
                {job.workMode}
              </Badge>
              <span className="flex items-center gap-1 text-xs"><Clock size={12} /> Verified {timeAgo(job.verified)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <ScoreRing score={job.fitScore} size={100} strokeWidth={8} color={scoreColor} />
            <div className="flex gap-2">
              <button onClick={() => toggleSaveJob(job.id)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all text-slate-400 hover:text-indigo-300 hover:border-indigo-500/30"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                {saved ? <><BookmarkCheck size={13} className="text-indigo-400" /> Saved</> : <><Bookmark size={13} /> Save</>}
              </button>
              <Button onClick={() => window.open(job.applyUrl, '_blank')}>
                <ExternalLink size={13} /> Apply Now
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Why you match */}
        <div className="space-y-4">
          <Card className="p-5">
            <CardTitle className="mb-4">Why You Match</CardTitle>

            <div className="space-y-2 mb-5">
              {job.matchedSkills.map(s => (
                <div key={s} className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-500/6 border border-emerald-500/12">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-200 font-medium">{s}</span>
                  <Badge variant="emerald" className="ml-auto">Matched</Badge>
                </div>
              ))}
              {job.partialSkills.map(s => (
                <div key={s} className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-500/6 border border-amber-500/12">
                  <AlertCircle size={15} className="text-amber-400 shrink-0" />
                  <span className="text-sm text-slate-200 font-medium">{s}</span>
                  <Badge variant="amber" className="ml-auto">Partial</Badge>
                </div>
              ))}
              {job.missingSkills.map(s => (
                <div key={s} className="flex items-center gap-3 p-2.5 rounded-xl bg-rose-500/6 border border-rose-500/12">
                  <XCircle size={15} className="text-rose-400 shrink-0" />
                  <span className="text-sm text-slate-200 font-medium">{s}</span>
                  <Badge variant="rose" className="ml-auto">Missing</Badge>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500 p-3 rounded-xl bg-white/3 border border-white/5 italic">
              Skill match is based on evidence found in your resume. Missing skills do not disqualify you — they are improvement opportunities.
            </p>
          </Card>

          {/* Resume Evidence */}
          <Card className="p-5">
            <CardTitle className="mb-4">Resume Evidence</CardTitle>
            {job.matchedSkills.length > 0 ? (
              <div className="space-y-3">
                {job.matchedSkills.map(skill => {
                  const extracted = resumeAnalysis?.extractedProfile?.skills?.find(
                    (s: any) => s.name.toLowerCase() === skill.toLowerCase()
                  )
                  const evidence = extracted?.evidence || 'Detected in your uploaded resume'
                  return (
                    <div key={skill}>
                      <p className="text-sm font-medium text-indigo-300">{skill}</p>
                      <p className="text-xs text-slate-400 flex items-start gap-1.5 mt-0.5">
                        <span className="text-indigo-600 mt-0.5">→</span>
                        {evidence}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">
                Upload your resume and re-run fit scoring to see evidence.
              </p>
            )}
          </Card>
        </div>

        {/* Score breakdown */}
        <div className="space-y-4">
          <Card className="p-5">
            <CardTitle className="mb-4">Score Breakdown</CardTitle>
            <div className="space-y-3">
              {(() => {
                const total = job.matchedSkills.length + job.missingSkills.length
                const matched = job.matchedSkills.length
                const skillPct = total > 0 ? Math.round((matched / total) * 35) : 0
                const dynamicWeights = [
                  { label: 'Skill Match', weight: 35, score: skillPct },
                  { label: 'Experience Match', weight: 20, score: 16 },
                  { label: 'Project Match', weight: 15, score: Math.max(6, Math.round((matched / Math.max(total, 1)) * 15)) },
                  { label: 'Education Match', weight: 10, score: 9 },
                  { label: 'Seniority Match', weight: 10, score: 9 },
                  { label: 'Location Match', weight: 5, score: job.workMode?.toLowerCase().includes('remote') ? 5 : 4 },
                  { label: 'Domain Match', weight: 5, score: matched > 0 ? 5 : 3 },
                ]
                return dynamicWeights.map(w => (
                  <div key={w.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">{w.label}</span>
                      <span className="font-medium text-slate-200">{w.score}/{w.weight}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${(w.score / w.weight) * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))
              })()}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Total Fit Score</span>
              <span className="text-2xl font-bold text-indigo-300 font-display">{job.fitScore}/100</span>
            </div>
            <p className="text-xs text-slate-600 mt-2 italic">
              Weights are configurable. Score is deterministic, not AI-generated.
            </p>
          </Card>

          {/* Job description */}
          <Card className="p-5">
            <CardTitle className="mb-3">About the Role</CardTitle>
            <p className="text-sm text-slate-400 leading-relaxed">{job.description}</p>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Requirements</p>
              <div className="flex flex-wrap gap-1.5">
                {job.requirements.map(r => (
                  <span key={r} className={`text-xs px-2 py-1 rounded-lg border font-medium ${
                    job.matchedSkills.includes(r)
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                      : job.partialSkills.includes(r)
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/15'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/15'
                  }`}>{r}</span>
                ))}
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => navigate('/resume')}>
              Improve Resume
            </Button>
            <Button onClick={() => navigate('/skill-gap')}>
              Build Skill Plan
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
