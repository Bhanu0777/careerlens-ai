import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Briefcase, Zap, BarChart3, FileText } from 'lucide-react'
import { cn } from '../../lib/utils'

const bottomNavItems = [
  { path: '/dashboard', label: 'Home',    icon: LayoutDashboard },
  { path: '/resume',    label: 'Resume',  icon: FileText },
  { path: '/jobs',      label: 'Jobs',    icon: Briefcase },
  { path: '/skill-gap', label: 'Skills',  icon: Zap },
  { path: '/market',    label: 'Market',  icon: BarChart3 },
]

export function BottomNav() {
  const location = useLocation()
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-indigo-500/15"
      style={{ background: 'rgba(10,10,20,0.97)', backdropFilter: 'blur(20px)' }}>
      <div className="flex items-center justify-around px-2 py-2">
        {bottomNavItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname.startsWith(path)
          return (
            <NavLink key={path} to={path}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all min-w-[56px]',
                isActive ? 'text-indigo-400' : 'text-slate-500'
              )}>
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
