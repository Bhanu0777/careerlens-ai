import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from './components/layout/Layout'
import { PageSkeleton } from './components/ui/Skeleton'
import { ErrorBoundary } from './components/ErrorBoundary'

// ── Core pages only ────────────────────────────────────────────────────────
const Landing            = lazy(() => import('./pages/Landing'))
const Onboarding         = lazy(() => import('./pages/Onboarding'))
const Dashboard          = lazy(() => import('./pages/Dashboard'))
const ResumeIntelligence = lazy(() => import('./pages/ResumeIntelligence'))
const MarketIntelligence = lazy(() => import('./pages/MarketIntelligence'))
const SkillGap           = lazy(() => import('./pages/SkillGap'))
const Jobs               = lazy(() => import('./pages/Jobs'))
const JobMatch           = lazy(() => import('./pages/JobMatch'))
const NotFound           = lazy(() => import('./pages/NotFound'))

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(19,19,31,0.97)',
            border: '1px solid rgba(99,102,241,0.25)',
            color: '#e2e8f0',
            borderRadius: '12px',
            backdropFilter: 'blur(16px)',
          },
        }}
        richColors
      />

      <ErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Public */}
            <Route path="/"           element={<Landing />} />
            <Route path="/onboarding" element={<Onboarding />} />

            {/* App — inside shared Layout */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/resume"    element={<ResumeIntelligence />} />
              <Route path="/market"    element={<MarketIntelligence />} />
              <Route path="/skill-gap" element={<SkillGap />} />
              <Route path="/jobs"      element={<Jobs />} />
              <Route path="/jobs/:id"  element={<JobMatch />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
