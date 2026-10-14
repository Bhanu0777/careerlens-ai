import { useAppStore } from '../stores/appStore'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authUser, authLoading } = useAppStore()

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-animated">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  if (!authUser) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}
