import { useState, useRef, useEffect } from 'react'
import { Bell, Sparkles, X, CheckCheck, Briefcase, Zap, TrendingUp, Info, LogOut } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'
import type { Notification } from '../../stores/appStore'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/resume':    'Resume Intelligence',
  '/market':    'Market Intelligence',
  '/skill-gap': 'Skill Gap Analysis',
  '/jobs':      'Jobs',
}

const notifIcons: Record<Notification['type'], React.ElementType> = {
  job:    Briefcase,
  skill:  Zap,
  market: TrendingUp,
  plan:   Info,
  system: Info,
}

const notifColors: Record<Notification['type'], string> = {
  job:    '#6366f1',
  skill:  '#f59e0b',
  market: '#10b981',
  plan:   '#06b6d4',
  system: '#94a3b8',
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

export function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, notifications, markNotificationRead, markAllNotificationsRead, authUser, signOut } = useAppStore()
  const [showNotifs, setShowNotifs] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const title = Object.entries(pageTitles).find(([k]) => location.pathname.startsWith(k))?.[1] || 'CareerLens AI'
  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    if (showNotifs) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotifs])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    if (showUserMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showUserMenu])

  const handleNotifClick = (n: Notification) => {
    markNotificationRead(n.id)
    if (n.actionUrl) navigate(n.actionUrl)
    setShowNotifs(false)
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 py-3 border-b border-indigo-500/10"
      style={{ background: 'rgba(10,10,20,0.9)', backdropFilter: 'blur(20px)' }}>

      {/* Left: title */}
      <div className="flex items-center gap-3">
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-white text-sm">CareerLens</span>
        </div>
        <h1 className="hidden lg:block text-base font-semibold text-white">{title}</h1>
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setShowNotifs(v => !v)}
            className={cn(
              'relative w-8 h-8 flex items-center justify-center rounded-lg transition-all',
              showNotifs ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-slate-200',
            )}
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <Bell size={15} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 w-80 glass rounded-2xl shadow-2xl overflow-hidden"
                style={{ border: '1px solid rgba(99,102,241,0.2)', zIndex: 100 }}>

                <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
                  <span className="text-sm font-bold text-white">Notifications</span>
                  <div className="flex items-center gap-2">
                    {unread > 0 && (
                      <button onClick={markAllNotificationsRead}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
                        <CheckCheck size={12} /> Mark all read
                      </button>
                    )}
                    <button onClick={() => setShowNotifs(false)} className="text-slate-500 hover:text-slate-300">
                      <X size={15} />
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications</div>
                  ) : (
                    notifications.map(n => {
                      const Icon = notifIcons[n.type] || Info
                      const color = notifColors[n.type] || '#94a3b8'
                      return (
                        <button key={n.id} onClick={() => handleNotifClick(n)}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/4 transition-colors border-b border-white/4 last:border-0',
                            !n.read && 'bg-indigo-500/4',
                          )}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: `${color}18` }}>
                            <Icon size={13} style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-xs font-semibold', n.read ? 'text-slate-400' : 'text-white')}>
                              {n.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.createdAt)}</p>
                          </div>
                          {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />}
                        </button>
                      )
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar with dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(v => !v)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-400 flex items-center justify-center text-white text-xs font-bold hover:opacity-80 transition-opacity"
          >
            {profile?.name?.charAt(0) || authUser?.email?.charAt(0)?.toUpperCase() || 'U'}
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 w-56 glass rounded-2xl shadow-2xl overflow-hidden"
                style={{ border: '1px solid rgba(99,102,241,0.2)', zIndex: 100 }}
              >
                {/* Email display */}
                <div className="px-4 py-3 border-b border-white/6">
                  <p className="text-xs text-slate-500">Signed in as</p>
                  <p className="text-sm text-white font-medium truncate mt-0.5">{authUser?.email || 'Guest'}</p>
                </div>
                {/* Sign out */}
                <button
                  onClick={async () => {
                    setShowUserMenu(false)
                    await signOut()
                    navigate('/')
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
