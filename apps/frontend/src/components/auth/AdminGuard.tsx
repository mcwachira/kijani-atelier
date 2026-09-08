import { Navigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { useAuth } from '@/hooks/use-auth'

interface AdminGuardProps {
  children: ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, hydrated } = useAuth()

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" />
  }

  return <>{children}</>
}
