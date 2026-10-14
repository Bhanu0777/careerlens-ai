import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Zap, Trophy, Target, ChevronRight, Clock, BookOpen, ExternalLink, Flame,
  AlertTriangle, RefreshCw, Database
} from 'lucide-react'
import { Card, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../stores/appStore'
import { fetchJobsFromDB, type JobRow } from '../lib/supabaseData'

interface SkillGap {
  name: string
  candidateLevel: string
  marketDemand: string
  opportunity_score: number
  priority: string
  why: string
  evidence: {
    jobsRequiring: number
    totalJobsAnalyzed: number
    candidateHas: boolean
  }
}

const learningResources: Record<string, { name: string; url: string; effort: string }[]> = {
  Docker: [
    { name: 'Docker Official Docs', url: 'https://docs.docker.com/get-started/', effort: '3 hrs' },
    { name: 'Docker for Beginners — FreeCodeCamp', url: 'https://www.youtube.com/watch?v=iJJG_h0onwU', effort: '5 hrs' },
    { name: 'Dockerfile Best Practices', url: 'https://docs.docker.com/develop/develop-images/dockerfile_best-practices/', effort: '1 hr' },
  ],
  Cloud: [
    { name: 'AWS Cloud Practitioner', url: 'https://aws.amazon.com/certification/certified-cloud-practitioner/', effort: '10 hrs' },
    { name: 'GCP Associate Cloud Engineer', url: 'https://cloud.google.com/certification', effort: '12 hrs' },
    { name: 'Cloud Run + FastAPI Deployment', url: 'https://cloud.google.com/run/docs/quickstarts', effort: '4 hrs' },
  ],
  MLOps: [
    { name: 'MLOps Zoomcamp (Free)', url: 'https://github.com/DataTalksClub/mlops-zoomcamp', effort: '20 hrs' },
    { name: 'MLflow Quickstart', url: 'https://mlflow.org/docs/latest/quickstart.html', effort: '3 hrs' },
    { name: 'GitHub Actions for ML', url: 'https://docs.github.com/en/actions', effort: '2 hrs' },
  ],
  Kubernetes: [
    { name: 'Kubernetes Basics', url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/', effort: '4 hrs' },
    { name: 'Kubernetes Up & Running (Book)', url: 'https://www.oreilly.com/library/view/kubernetes-up-and/9781491941427/', effort: '15 hrs' },
  ],
  LangChain: [
    { name: 'LangChain Official Docs', url: 'https://python.langchain.com/docs/get_started', effort: '5 hrs' },
    { name: 'LangChain Tutorials', url: 'https://python.langchain.com/docs/tutorials', effort: '3 hrs' },
  ],
  CI: [
    { name: 'GitHub Actions Docs', url: 'https://docs.github.com/en/actions', effort: '3 hrs' },
    { name: 'CI/CD Best Practices', url: 'https://docs.github.com/en/actions/learn', effort: '4 hrs' },
  ],
}

export default function SkillGap() {
  const navigate = useNavigate()
  const { gaps, skills, jobs } = useAppStore()
  const [selected, setSelected] = React.useState<string>(gaps[0]?.name || '')
  const [loadingGaps, setLoadingGaps] = useState(false)
  const [candidateSkillsSet, setCandidateSkillsSet] = useState<Set<string>>(new Set())
  const [marketJobCount, setMarketJobCount] = useState<number>(0)
  const [collecting, setCollecting] = useState(false)
  const calculatingRef = useRef(false)
  
  const selectedGap = gaps.find(g => g.name === selected)

  // Build candidate skill set from profile
  useEffect(() => {
    if (skills && skills.length > 0) {
      setCandidateSkillsSet(new Set(skills.map(s => s.name.toLowerCase())))
    }
  }, [skills])

  // Calculate gaps from real job data
  const calculateGapsFromJobs = async () => {
    if (calculatingRef.current) return
    calculatingRef.current = true
    setLoadingGaps(true)
    try {
      const allJobs = await fetchJobsFromDB('', '', 'verified_active')
      if (allJobs.length === 0) {
        return
      }
      
      setMarketJobCount(allJobs.length)
      
      // Count skill occurrences in job requirements
      const skillFrequency: Record<string, number> = {}
      allJobs.forEach(job => {
        if (job.requirements) {
          job.requirements.forEach(req => {
            const normalized = req.toLowerCase().trim()
            skillFrequency[normalized] = (skillFrequency[normalized] || 0) + 1
          })
        }
      })
      
      // Find gaps: skills in jobs but not in candidate
      const newGaps: SkillGap[] = []
      Object.entries(skillFrequency).forEach(([skillName, count]) => {
        if (!candidateSkillsSet.has(skillName)) {
          const pct = (count / allJobs.length) * 100
          const score = Math.min(95, Math.round(60 + pct * 0.34))
          newGaps.push({
            name: skillName,
            candidateLevel: 'Missing',
            marketDemand: pct >= 50 ? 'Very High' : pct >= 30 ? 'High' : 'Medium',
            opportunity_score: score,
            priority: score >= 90 ? 'Critical' : score >= 80 ? 'High' : 'Medium',
            why: `${skillName} appears in ${count} of ${allJobs.length} verified job postings.`,
            evidence: {
              jobsRequiring: count,
              totalJobsAnalyzed: allJobs.length,
              candidateHas: false,
            }
          })
        }
      })
      
      newGaps.sort((a, b) => b.evidence.jobsRequiring - a.evidence.jobsRequiring)
      setSelected(newGaps[0]?.name || selected)
      
    } catch (e) {
      console.error('Failed to calculate gaps from jobs:', e)
    } finally {
      calculatingRef.current = false
      setLoadingGaps(false)
    }
  }

  useEffect(() => {
    if (jobs.length > 0 && skills.length > 0) {
      calculateGapsFromJobs()
    }
  }, [jobs, skills])

  // Display gaps
  const displayGaps = gaps.length > 0 ? gaps : (loadingGaps ? [] : [])

  // Recommended projects based on top 3 gaps
  const recommendedProjects = displayGaps.slice(0, 3).length > 0 ? [
    {
      title: `Build a Project Covering Your Top Gaps`,
      description: `Create a project that demonstrates ${displayGaps.slice(0, 3).map(g => g.name).join(', ')} — the skills most demanded in your target market.`,
      skills: displayGaps.slice(0, 3).map(g => g.name),
      jobsUnlocked: displayGaps.slice(0, 3).reduce((sum, g) => sum + Math.round(g.evidence?.jobsRequiring || 0), 0),
      steps: [
        `Focus on ${displayGaps[0]?.name || 'highest-priority skill'}`,
        'Add measurable outcomes',
        'Dockerize and deploy',
        'Document with README + metrics',
      ],
    }
  ] : []

  return (
    <motion.div className="p-4 md:p-6 max-w-6xl space-y-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-white mb-1">Skill Gap Analysis</h1>
        <p className="text-slate-400 text-sm">
          {marketJobCount > 0 
            ? `Comparing your profile against ${marketJobCount} verified job postings`
            : 'Upload your resume and collect jobs to analyze skill gaps'}
        </p>
      </div>

      {/* Hero CTA */}
      <Card className="p-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.08))', borderColor: 'rgba(99,102,241,0.25)' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center glow-brand">
            <Zap size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white mb-1">🚀 Find My Next Skill</h2>
            <p className="text-sm text-slate-400">
              {displayGaps.length > 0
                ? `AI has identified ${displayGaps.length} skill gaps based on ${marketJobCount} verified jobs.`
                : 'Upload your resume and collect jobs to identify high-value skill opportunities.'}
            </p>
          </div>
          {displayGaps.length === 0 && (
            <Button size="sm" onClick={() => navigate('/jobs')}>
              <Database size={14} /> Collect Jobs
            </Button>
          )}
        </div>
      </Card>

      {displayGaps.length === 0 ? (
        <Card className="p-10 text-center">
          <Zap size={40} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No skill gaps identified yet</h3>
          <p className="text-slate-400 text-sm mb-4">
            {skills.length === 0 
              ? 'Upload your resume to detect your current skills.'
              : 'No verified jobs in database — run job collection to calculate real skill gaps.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="ghost" size="sm" onClick={() => navigate('/resume')}>
              Upload Resume
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/jobs')}>
              Collect Jobs
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Gap List */}
          <div className="space-y-3">
            <CardTitle className="mb-2">Opportunity Score</CardTitle>
            {displayGaps.map((gap, i) => (
              <button key={gap.name} onClick={() => setSelected(gap.name)}
                className={`w-full p-4 rounded-2xl text-left transition-all ${
                  selected === gap.name
                    ? 'glass border-indigo-500/40 glow-brand'
                    : 'glass glass-hover border-transparent'
                }`}
                style={{ border: '1px solid' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {i < 3 && (
                      <span className="text-base">{['🥇', '🥈', '🥉'][i]}</span>
                    )}
                    <span className="text-sm font-bold text-white">{gap.name}</span>
                  </div>
                  <span className={`text-lg font-bold font-display ${
                    gap.opportunity_score >= 90 ? 'text-rose-400' :
                    gap.opportunity_score >= 80 ? 'text-amber-400' : 'text-indigo-400'
                  }`}>{gap.opportunity_score}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-white/6">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                    style={{ width: `${gap.opportunity_score}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500">
                    {gap.evidence?.jobsRequiring ?? 0}/{marketJobCount} jobs
                  </span>
                  <Badge variant={gap.priority === 'Critical' ? 'rose' : gap.priority === 'High' ? 'amber' : 'slate'} size="sm">
                    {gap.priority}
                  </Badge>
                </div>
              </button>
            ))}
          </div>

          {/* Gap Detail */}
          <div className="lg:col-span-2 space-y-4">
            {selectedGap && (
              <>
                <Card className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white font-display">{selectedGap.name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant={selectedGap.priority === 'Critical' ? 'rose' : 'amber'}>{selectedGap.priority} Priority</Badge>
                        <Badge variant="slate">
                          {selectedGap.evidence?.jobsRequiring ?? 0} of {marketJobCount} jobs require it
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-indigo-300 font-display">{selectedGap.opportunity_score}</div>
                      <div className="text-xs text-slate-500">Opportunity Score</div>
                    </div>
                  </div>

                  {/* Evidence Matrix */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { 
                        label: 'Your Level', 
                        value: selectedGap.candidateLevel, 
                        color: selectedGap.candidateLevel === 'Missing' ? '#f43f5e' : '#f59e0b' 
                      },
                      { 
                        label: 'Market Demand', 
                        value: selectedGap.marketDemand, 
                        color: '#6366f1' 
                      },
                      { 
                        label: 'Jobs Requiring', 
                        value: `${selectedGap.evidence?.jobsRequiring ?? 0}`,
                        color: '#10b981' 
                      },
                    ].map(m => (
                      <div key={m.label} className="p-3 rounded-xl text-center" style={{ background: `${m.color}10`, border: `1px solid ${m.color}25` }}>
                        <div className="text-sm font-bold" style={{ color: m.color }}>{m.value}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{m.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Why it matters - evidence based */}
                  <div className="p-3 rounded-xl bg-amber-500/6 border border-amber-500/15 text-sm text-slate-300">
                    <p className="font-medium text-amber-300 mb-1 flex items-center gap-1.5">
                      <Flame size={13} /> Why {selectedGap.name} matters
                    </p>
                    <p>
                      This skill appears in <strong className="text-white">{selectedGap.evidence?.jobsRequiring ?? '—'}</strong> 
                      {' '}of <strong className="text-white">{marketJobCount}</strong> 
                      {' '}verified job postings in your target market.
                      {selectedGap.why && (
                        <> <br /><br />{selectedGap.why}</>
                      )}
                    </p>
                  </div>
                </Card>

                {/* Provenance */}
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={16} className="text-slate-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-500">
                      <p className="font-medium text-slate-400 mb-1">Data Source</p>
                      <p>Gap analysis derived from actual job postings in the CareerLens database.</p>
                      <p>Last calculated from {marketJobCount} verified active jobs.</p>
                    </div>
                  </div>
                </Card>

                {/* Learning Resources */}
                {selectedGap && learningResources[selectedGap.name] && (
                  <Card className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen size={15} className="text-cyan-400" />
                      <CardTitle>Learning Resources</CardTitle>
                    </div>
                    <div className="space-y-2">
                      {learningResources[selectedGap.name].map(r => (
                        <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-white/4 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-md bg-cyan-500/15 flex items-center justify-center">
                              <ExternalLink size={11} className="text-cyan-400" />
                            </div>
                            <span className="text-sm text-slate-200 group-hover:text-white">{r.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock size={11} /> {r.effort}
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* Recommended Project */}
            {recommendedProjects.length > 0 && (
              <Card className="p-6" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Trophy size={20} className="text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-white">Recommended Project</h3>
                      <Badge variant="emerald">Unlocks {recommendedProjects[0].jobsUnlocked} jobs</Badge>
                    </div>
                    <h4 className="text-lg font-bold font-display text-emerald-300 mb-2">{recommendedProjects[0].title}</h4>
                    <p className="text-sm text-slate-400">{recommendedProjects[0].description}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Skills Demonstrated</p>
                    <div className="flex flex-wrap gap-1.5">
                      {recommendedProjects[0].skills.map(s => (
                        <span key={s} className="text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Steps</p>
                    <div className="space-y-1">
                      {recommendedProjects[0].steps.map((s, i) => (
                        <div key={s} className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="w-4 h-4 rounded-full bg-white/6 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">{i + 1}</span>
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Button className="mt-5" onClick={() => navigate('/jobs')}>
                  Find Matching Jobs <ChevronRight size={14} />
                </Button>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Data freshness notice */}
      <Card className="p-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Database size={12} />
          <span>Data freshness: gaps calculated from {marketJobCount} verified jobs in database</span>
        </div>
      </Card>
    </motion.div>
  )
}