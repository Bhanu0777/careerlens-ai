import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Target, ChevronRight, CheckCircle2, Loader2,
  Sparkles, AlertCircle, FileCheck
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../stores/appStore'
import { uploadResume } from '../lib/api'
import { toast } from 'sonner'
import type { ResumeAnalysis } from '../stores/appStore'

const locations = ['Hyderabad', 'Bengaluru', 'Pune', 'Chennai', 'Mumbai', 'Delhi NCR', 'Remote', 'Anywhere in India']
const jobTypes = ['Internship', 'Full-time', 'Both']
const experienceLevels = ['Fresher', '0–1 years', '1–2 years', '2–3 years']
const domains = ['AI/ML', 'Software Engineering', 'Data Science', 'Backend', 'Frontend', 'Cloud', 'Cybersecurity', 'DevOps']
const careerGoals = [
  'Get internship', 'Get first job', 'Switch role', 'Improve salary',
  'Enter AI/ML', 'Enter software engineering', 'Explore career options',
]

const analysisSteps = [
  'Personal information',
  'Education',
  'Experience',
  'Skills',
  'Projects',
  'Certifications',
  'Technologies',
  'Achievements',
  'Building your career profile…',
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { setHasResume, setOnboardingComplete, updateSettings, runCareerAnalysis } = useAppStore()
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [retryError, setRetryError] = useState<string | null>(null)
  const [prefs, setPrefs] = useState({
    locations: [] as string[],
    jobType: 'Both',
    experience: 'Fresher',
    domains: [] as string[],
    goal: '',
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDrop: (accepted, rejected) => {
      if (rejected.length > 0) {
        const err = rejected[0].errors[0]
        setUploadError(err.code === 'file-too-large' ? 'File too large. Max 10 MB.' : 'Only PDF or DOCX files accepted.')
        return
      }
      setUploadError(null)
      if (accepted[0]) setFile(accepted[0])
    },
  })

  const toggleArr = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]

  const startAnalysis = async () => {
    setAnalyzing(true)
    setUploadError(null)
    setRetryError(null)

    // Animate steps while API call runs
    let stepIdx = 0
    const interval = setInterval(() => {
      stepIdx++
      setAnalysisStep(s => {
        if (s < analysisSteps.length - 2) return s + 1
        clearInterval(interval)
        return s
      })
    }, 500)

    let analysis: ResumeAnalysis | undefined = undefined
    let backendError = false

    try {
      if (file) {
        const result = await uploadResume(file)
        if (result) {
          analysis = {
            overallScore: result.overallScore,
            breakdown: result.breakdown ?? {},
            strengths: result.strengths ?? [],
            improvements: result.improvements ?? [],
            extractedProfile: result.extractedProfile ?? {},
          } as ResumeAnalysis
          toast.success(`Resume analyzed — ${result.extractedProfile?.skills?.length ?? 0} skills detected`)
        } else {
          backendError = true
          toast.error('Analysis failed — backend did not return results. Check the backend is running.')
        }
      }
    } catch (err) {
      backendError = true
      toast.error('Could not reach backend. Make sure the backend server is running on port 8000.')
    } finally {
      clearInterval(interval)
      setAnalysisStep(analysisSteps.length - 1)
      await new Promise(r => setTimeout(r, 700))
      setAnalyzing(false)

      if (backendError) {
        // Stay on onboarding — don't proceed with no real data
        setStep(3)
        setRetryError('Analysis failed — check the backend is running on port 8000 and try again.')
        return
      }

      // Persist preferences
      updateSettings({
        preferredLocations: prefs.locations,
        jobType: prefs.jobType,
        experienceLevel: prefs.experience,
        domains: prefs.domains,
        careerGoal: prefs.goal,
      })

      setHasResume(true, analysis)
      setOnboardingComplete(true)
      runCareerAnalysis()
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-animated flex items-center justify-center p-4">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-white text-lg">CareerLens AI</span>
          </div>
          {!analyzing && (
            <div className="flex items-center justify-center gap-2 mb-2">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-indigo-500' : 'bg-white/10'
                } ${s === step ? 'w-8' : 'w-4'}`} />
              ))}
            </div>
          )}
          <p className="text-sm text-slate-500">
            {analyzing ? 'AI Analysis Running…' : `Step ${step} of 3`}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 1 — Upload ─────────────────────────────────────────── */}
          {step === 1 && !analyzing && (
            <motion.div key="s1"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="glass rounded-3xl p-8">
              <h2 className="font-display text-2xl font-bold text-white mb-2">Upload Your Resume</h2>
              <p className="text-slate-400 text-sm mb-6">Supported: PDF, DOCX · Max 10 MB</p>

              <div {...getRootProps()} className={`
                border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
                ${isDragActive ? 'border-indigo-400 bg-indigo-500/10'
                  : file ? 'border-emerald-500/50 bg-emerald-500/5'
                  : uploadError ? 'border-rose-500/40 bg-rose-500/5'
                  : 'border-indigo-500/25 hover:border-indigo-500/50 hover:bg-indigo-500/5'}
              `}>
                <input {...getInputProps()} />
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                      <FileCheck size={28} className="text-emerald-400" />
                    </div>
                    <p className="font-medium text-white">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB · Click to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 flex items-center justify-center">
                      <Upload size={28} className="text-indigo-400" />
                    </div>
                    <p className="font-medium text-white">Drag & Drop your resume</p>
                    <p className="text-slate-500 text-sm">or <span className="text-indigo-400 underline">browse files</span></p>
                    <p className="text-xs text-slate-600">PDF or DOCX · Max 10 MB</p>
                  </div>
                )}
              </div>

              {uploadError && (
                <p className="flex items-center gap-2 text-xs text-rose-400 mt-3">
                  <AlertCircle size={13} /> {uploadError}
                </p>
              )}

              <Button className="w-full mt-6" disabled={!file} onClick={() => setStep(2)}>
                Continue <ChevronRight size={16} />
              </Button>
            </motion.div>
          )}

          {/* ── Step 2 — Preferences ─────────────────────────────────────── */}
          {step === 2 && !analyzing && (
            <motion.div key="s2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="glass rounded-3xl p-8 space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-white mb-1">Career Preferences</h2>
                <p className="text-slate-400 text-sm">Help us personalize your results</p>
              </div>

              {[
                { label: 'Experience Level', key: 'experience' as const, opts: experienceLevels, multi: false, color: 'indigo' },
                { label: 'Job Type', key: 'jobType' as const, opts: jobTypes, multi: false, color: 'indigo' },
              ].map(({ label, key, opts, color }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-3">{label}</label>
                  <div className="flex flex-wrap gap-2">
                    {opts.map(o => (
                      <button key={o}
                        onClick={() => setPrefs(p => ({ ...p, [key]: o }))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          prefs[key] === o
                            ? `bg-${color}-500/25 text-${color}-300 border border-${color}-500/50`
                            : 'bg-white/5 text-slate-400 border border-white/8 hover:bg-white/8'
                        }`}
                        style={prefs[key] === o ? { background: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.5)', color: '#a5b4fc' } : {}}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-3">Preferred Locations</label>
                <div className="flex flex-wrap gap-2">
                  {locations.map(loc => (
                    <button key={loc}
                      onClick={() => setPrefs(p => ({ ...p, locations: toggleArr(p.locations, loc) }))}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                      style={prefs.locations.includes(loc)
                        ? { background: 'rgba(6,182,212,0.15)', borderColor: 'rgba(6,182,212,0.4)', color: '#67e8f9', border: '1px solid' }
                        : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid' }}>
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-3">Preferred Domains</label>
                <div className="flex flex-wrap gap-2">
                  {domains.map(d => (
                    <button key={d}
                      onClick={() => setPrefs(p => ({ ...p, domains: toggleArr(p.domains, d) }))}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                      style={prefs.domains.includes(d)
                        ? { background: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.4)', color: '#c4b5fd', border: '1px solid' }
                        : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={() => setStep(3)}>Continue <ChevronRight size={16} /></Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3 — Goal ────────────────────────────────────────────── */}
          {step === 3 && !analyzing && (
            <motion.div key="s3"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="glass rounded-3xl p-8">
              <h2 className="font-display text-2xl font-bold text-white mb-2">What's Your Goal?</h2>
              <p className="text-slate-400 text-sm mb-6">Personalizes your career plan and job recommendations</p>

              <div className="space-y-2 mb-6">
                {careerGoals.map(goal => (
                  <button key={goal} onClick={() => setPrefs(p => ({ ...p, goal }))}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                      prefs.goal === goal
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50'
                        : 'bg-white/4 text-slate-400 border border-white/6 hover:bg-white/8 hover:text-slate-200'
                    }`}>
                    <Target size={14} className={prefs.goal === goal ? 'text-indigo-400' : 'text-slate-600'} />
                    {goal}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
                <div className="flex-1 flex flex-col gap-2">
                  {retryError && (
                    <p className="text-red-500 text-sm mb-2">{retryError}</p>
                  )}
                  <Button className="w-full" onClick={startAnalysis}>
                    <Sparkles size={16} />
                    Analyze My Resume
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Analyzing ────────────────────────────────────────────────── */}
          {analyzing && (
            <motion.div key="analyzing"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-3xl p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mx-auto mb-6 glow-brand">
                <Loader2 size={28} className="text-white animate-spin" />
              </div>
              <h2 className="font-display text-xl font-bold text-white mb-2">Analyzing your resume…</h2>
              <p className="text-slate-400 text-sm mb-8">Building your career intelligence profile</p>

              <div className="space-y-3 text-left">
                {analysisSteps.map((s, i) => (
                  <motion.div key={s}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: i <= analysisStep ? 1 : 0.25, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 text-sm">
                    {i < analysisStep
                      ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      : i === analysisStep
                        ? <Loader2 size={16} className="text-indigo-400 shrink-0 animate-spin" />
                        : <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />}
                    <span className={i <= analysisStep ? 'text-slate-200' : 'text-slate-600'}>{s}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
