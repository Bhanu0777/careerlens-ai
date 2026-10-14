import { useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Upload, Loader2, FileCheck, RefreshCw } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { Card, CardTitle } from '../components/ui/Card'
import { ScoreRing, ProgressBar } from '../components/ui/ScoreRing'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ScoreCardSkeleton } from '../components/ui/Skeleton'
import { uploadResume } from '../lib/api'
import { useAppStore } from '../stores/appStore'
import { toast } from 'sonner'
import type { ResumeAnalysis } from '../stores/appStore'



export default function ResumeIntelligence() {
  const { resumeAnalysis, setHasResume, addResumeVersion, runCareerAnalysis } = useAppStore()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Current analysis — real API data only, never fake defaults
  const analysis = resumeAnalysis
  const overallScore = analysis?.overallScore ?? 0
  const breakdown = analysis?.breakdown ?? {}
  const strengths = analysis?.strengths ?? []
  const improvements = analysis?.improvements ?? []
  const profile = analysis?.extractedProfile

  // Section scores from real breakdown only — no fallback
  const sections = Object.keys(breakdown).length > 0
    ? Object.entries(breakdown).map(([name, score]) => ({
        name,
        score,
        status: score >= 80 ? 'good' : score >= 55 ? 'warning' : 'missing' as string,
      }))
    : []

  // ── Dropzone ────────────────────────────────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    noClick: false,
    onDrop: async (accepted, rejected) => {
      if (rejected.length > 0) {
        setUploadError('Only PDF or DOCX, max 10 MB.')
        return
      }
      if (!accepted[0]) return
      setUploadError(null)
      await runAnalysis(accepted[0])
    },
  })

  const runAnalysis = async (file: File) => {
    setUploading(true)
    const tid = toast.loading(`Analyzing ${file.name}…`)
    try {
      const result = await uploadResume(file)
      if (result) {
        const newAnalysis: ResumeAnalysis = {
          overallScore: result.overallScore,
          breakdown: result.breakdown ?? {},
          strengths: result.strengths ?? [],
          improvements: result.improvements ?? [],
          extractedProfile: result.extractedProfile ?? {},
        } as ResumeAnalysis
        setHasResume(true, newAnalysis)
        addResumeVersion({
          name: `${file.name.replace(/\.(pdf|docx)$/i, '')} — Analyzed`,
          createdAt: new Date().toISOString(),
          matchScore: result.overallScore,
          isOriginal: false,
        })
        toast.success(`Analysis complete — ${result.extractedProfile?.skills?.length ?? 0} skills detected`, { id: tid })
        // Trigger real career analysis now that we have skills
        runCareerAnalysis()
      } else {
        toast.error('Analysis failed — backend may be offline. Showing demo data.', { id: tid })
      }
    } catch (e) {
      toast.error('Could not reach the backend. Check it is running.', { id: tid })
    } finally {
      setUploading(false)
    }
  }

  return (
    <motion.div className="p-4 md:p-6 max-w-5xl space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Resume Intelligence</h1>
          <p className="text-slate-400 text-sm">Deep analysis of your resume content and structure</p>
        </div>
        {analysis && (
          <Badge variant="emerald" className="mt-1">AI Analyzed</Badge>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Score ring */}
        <Card className="p-6 flex flex-col items-center text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Career Evidence Score</p>
          {uploading ? (
            <ScoreCardSkeleton />
          ) : analysis ? (
            <ScoreRing score={overallScore} size={130} strokeWidth={10} color="#6366f1" />
          ) : (
            <div className="w-32 h-32 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
              <p className="text-xs text-slate-600 text-center px-2">Upload resume to score</p>
            </div>
          )}
          <p className="text-xs text-slate-500 mt-3">
            {analysis
              ? 'Score based on your actual resume content.'
              : 'Upload your resume to see your real score.'}
          </p>

          {/* Upload drop zone (inline) */}
          <div {...getRootProps()} className={`mt-4 w-full border-2 border-dashed rounded-xl p-3 cursor-pointer transition-all text-center
            ${isDragActive ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/10 hover:border-indigo-500/40 hover:bg-white/4'}`}>
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-xs text-indigo-400">
                <Loader2 size={14} className="animate-spin" />
                Analyzing…
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Upload size={13} />
                {analysis ? 'Upload new version' : 'Upload resume (PDF/DOCX)'}
              </div>
            )}
          </div>

          {uploadError && (
            <p className="flex items-center gap-1 text-xs text-rose-400 mt-2">
              <AlertCircle size={12} /> {uploadError}
            </p>
          )}
        </Card>

        {/* Section scores */}
        <Card className="p-5 lg:col-span-2">
          <CardTitle className="mb-4">Section Analysis</CardTitle>
          {sections.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Upload your resume to see section scores.</p>
          ) : (
          <div className="space-y-3">
            {sections.map(s => (
              <div key={s.name} className="flex items-center gap-3">
                {s.status === 'good'
                  ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  : s.status === 'missing'
                    ? <AlertCircle size={15} className="text-rose-400 shrink-0" />
                    : <AlertCircle size={15} className="text-amber-400 shrink-0" />}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-200">{s.name}</span>
                    <span className={`text-xs font-bold ${
                      s.score >= 80 ? 'text-emerald-400' : s.score >= 60 ? 'text-amber-400' : 'text-rose-400'
                    }`}>{s.score}/100</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-white/6">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: s.score >= 80 ? '#10b981' : s.score >= 60 ? '#f59e0b' : '#f43f5e' }}
                      initial={{ width: 0 }} animate={{ width: `${s.score}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </Card>
      </div>

      {/* Strengths */}
      <Card className="p-5">
        <CardTitle className="mb-4">Strengths Detected</CardTitle>
        <div className="space-y-2">
          {strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/12">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300">{s}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Improvements */}
      {improvements.length > 0 && (
        <Card className="p-5">
          <CardTitle className="mb-4">Improvement Tips</CardTitle>
          <div className="space-y-3">
            {improvements.map((tip, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                tip.level === 'High' ? 'bg-rose-500/6 border-rose-500/15' :
                tip.level === 'Medium' ? 'bg-amber-500/6 border-amber-500/15' :
                'bg-indigo-500/6 border-indigo-500/15'
              }`}>
                <AlertCircle size={15} className={
                  tip.level === 'High' ? 'text-rose-400 shrink-0 mt-0.5' :
                  tip.level === 'Medium' ? 'text-amber-400 shrink-0 mt-0.5' : 'text-indigo-400 shrink-0 mt-0.5'
                } />
                <p className="text-sm text-slate-300 flex-1">{tip.text}</p>
                <Badge variant={tip.level === 'High' ? 'rose' : tip.level === 'Medium' ? 'amber' : 'indigo'} className="shrink-0">
                  {tip.level}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Extracted profile */}
      {profile && (
        <Card className="p-5">
          <CardTitle className="mb-4">Extracted Information</CardTitle>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Contact */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Candidate</p>
              <div className="p-3 rounded-xl bg-white/3 border border-white/6 space-y-1 text-sm">
                <p className="font-medium text-slate-200">{profile.name || 'Name not detected'}</p>
                {profile.email && <p className="text-slate-400 text-xs">{profile.email}</p>}
                <p className="text-slate-400 text-xs">{profile.experienceLevel} · {profile.targetRole}</p>
              </div>
            </div>

            {/* Skills */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                Top Skills ({(profile.skills ?? []).length} detected)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(profile.skills ?? []).slice(0, 12).map((s: any) => (
                  <span key={s.name} className="text-xs px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          {profile.summary && (
            <div className="mt-4 p-3 rounded-xl bg-white/3 border border-white/6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">AI Summary</p>
              <p className="text-sm text-slate-400 leading-relaxed">{profile.summary}</p>
            </div>
          )}

          <p className="text-xs text-slate-600 mt-4 italic">
            Extracted by AI from your resume. Review your Profile page to verify and correct any errors.
          </p>
        </Card>
      )}

      {!profile && !uploading && (
        <Card className="p-10 text-center">
          <div className="text-4xl mb-3">📄</div>
          <p className="text-slate-300 font-medium mb-2">No resume analyzed yet</p>
          <p className="text-slate-500 text-sm mb-4">Upload your resume above to see the full AI analysis</p>
        </Card>
      )}
    </motion.div>
  )
}
