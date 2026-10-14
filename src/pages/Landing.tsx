import { motion, useScroll, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles, Upload, Brain, TrendingUp, Zap, Briefcase, CheckCircle2, Star } from 'lucide-react'
import { Button } from '../components/ui/Button'

const flowSteps = [
  { label: 'YOUR RESUME', icon: Upload, color: '#6366f1' },
  { label: 'AI PROFILE', icon: Brain, color: '#8b5cf6' },
  { label: 'MARKET', icon: TrendingUp, color: '#06b6d4' },
  { label: 'SKILL GAPS', icon: Zap, color: '#f59e0b' },
  { label: 'BEST JOBS', icon: Briefcase, color: '#10b981' },
]

const howItWorks = [
  { num: '01', title: 'Upload', desc: 'Upload your resume in PDF or DOCX format.', icon: Upload },
  { num: '02', title: 'Understand', desc: 'AI extracts your skills, education, experience and projects.', icon: Brain },
  { num: '03', title: 'Compare', desc: 'Compare your profile with current market requirements.', icon: TrendingUp },
  { num: '04', title: 'Discover', desc: 'Find jobs that genuinely match your profile.', icon: Briefcase },
  { num: '05', title: 'Improve', desc: 'Get prioritized skill gaps and career recommendations.', icon: Zap },
]


export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-animated">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(10,10,20,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-white text-lg">CareerLens <span className="gradient-text-brand">AI</span></span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <Button variant="outline" size="sm" onClick={() => navigate('/onboarding')}>Get Started</Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/3 right-0 w-80 h-80 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }}
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
          <motion.div
            className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-indigo-300 mb-6"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Star size={12} className="text-amber-400" fill="currentColor" />
              AI-Powered Career Intelligence Platform
            </div>

            <h1 className="font-display text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
              Your Resume Knows<br />
              <span className="gradient-text">Your Past.</span>
            </h1>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
              CareerLens AI Finds<br />Your Next Move.
            </h2>

            <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-xl">
              Upload your resume and discover the roles you fit, skills the market wants,
              gaps holding you back, and verified opportunities worth applying to.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={() => navigate('/onboarding')}
                className="shadow-lg shadow-indigo-500/25">
                <Upload size={18} />
                Analyze My Resume
                <ArrowRight size={18} />
              </Button>
              <Button size="lg" variant="secondary" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>
                <span>Explore How It Works</span>
              </Button>
            </div>

            <div className="mt-8 flex items-center gap-4 text-xs text-slate-500">
              {['Free to use', 'No signup required', 'Instant analysis'].map((f) => (
                <div key={f} className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — workflow visualization */}
          <motion.div
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="glass rounded-3xl p-8 w-full max-w-sm">
              <p className="text-xs text-slate-500 font-medium tracking-widest mb-6 text-center">CAREER INTELLIGENCE FLOW</p>
              <div className="space-y-3">
                {flowSteps.map((step, i) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.15 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${step.color}20`, border: `1px solid ${step.color}40` }}>
                      <step.icon size={18} style={{ color: step.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">{step.label}</div>
                    </div>
                    {i < flowSteps.length - 1 && (
                      <div className="absolute left-[calc(50%-1px)] mt-14 w-0.5 h-4 bg-gradient-to-b from-indigo-500/30 to-transparent" />
                    )}
                  </motion.div>
                ))}
              </div>

            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold text-white mb-3">How CareerLens Works</h2>
          <p className="text-slate-400">Five steps from resume to ready.</p>
        </div>
        <div className="grid md:grid-cols-5 gap-6">
          {howItWorks.map((step, i) => (
            <motion.div key={step.num}
              className="glass rounded-2xl p-5 card-hover relative"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
              <div className="text-xs font-bold text-indigo-500 mb-3 tracking-widest">{step.num}</div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center mb-4">
                <step.icon size={18} className="text-indigo-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-2">{step.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 max-w-2xl mx-auto px-6 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
          <h2 className="font-display text-4xl font-bold text-white mb-4">
            Know your skills.<br />
            <span className="gradient-text">Close your gaps.</span><br />
            Find your next opportunity.
          </h2>
          <p className="text-slate-400 mb-8">
            Upload your resume and get a real picture of where you stand — skills, gaps, and the jobs that actually fit.
          </p>
          <Button size="lg" onClick={() => navigate('/onboarding')} className="shadow-xl shadow-indigo-500/30">
            <Upload size={18} />
            Analyze My Resume — It's Free
            <ArrowRight size={18} />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-indigo-500/10 py-8 text-center text-sm text-slate-600">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles size={14} className="text-indigo-500" />
          <span className="font-display font-semibold text-slate-400">CareerLens AI</span>
        </div>
        <p>Built with intelligence. Powered by honesty. No fabrications, ever.</p>
      </footer>
    </div>
  )
}
