import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Zap, BarChart3, Briefcase, FileText,
  ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'

const navItems = [
  { path: '/dashboard', label: 'Dashboard',          icon: LayoutDashboard },
  { path: '/resume',    label: 'Resume Intelligence', icon: FileText },
  { path: '/jobs',      label: 'Jobs',                icon: Briefcase },
  { path: '/skill-gap', label: 'Skill Gap',           icon: Zap },
  { path: '/market',    label: 'Market Intelligence', icon: BarChart3 },
]

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, profile, authUser } = useAppStore()
  const location = useLocation()

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 220 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="hidden lg:flex flex-col h-screen sticky top-0 shrink-0 overflow-hidden"
      style={{ background: 'rgba(13, 13, 25, 0.95)', borderRight: '1px solid rgba(99,102,241,0.12)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-indigo-500/10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0 glow-brand">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <span className="font-display font-bold text-white text-base leading-tight">CareerLens</span>
              <span className="block text-[10px] text-indigo-400 font-medium tracking-widest">AI</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname.startsWith(path)
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'text-indigo-200 bg-indigo-500/15'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              <Icon className={cn('shrink-0', isActive ? 'text-indigo-400' : '')} size={18} />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="truncate"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          )
        })}
      </nav>

      {/* Profile footer */}
      <div className="p-3 border-t border-indigo-500/10">
        <div className={cn('flex items-center gap-3 px-2 py-2 rounded-lg', sidebarCollapsed ? 'justify-center' : '')}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {profile?.name?.charAt(0) || authUser?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{profile?.name || authUser?.email?.split('@')[0] || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{authUser?.email || profile?.seniority || 'Entry-level'}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="mt-2 w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  )
}
