"use client"

import { useAuth0 } from "@auth0/auth0-react"
import { useQuery } from "convex/react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { api } from "@/convex/_generated/api"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoading: authLoading, isAuthenticated } = useAuth0()
  const router = useRouter()
  const pathname = usePathname()
  const user = useQuery(api.users.me, !authLoading && isAuthenticated ? {} : "skip")

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated || user === undefined) return

    if (user && !user.onboardingComplete && pathname !== "/onboarding") {
      router.replace("/onboarding")
      return
    }

    if (user && user.onboardingComplete && pathname === "/onboarding") {
      router.replace("/research")
    }
  }, [isAuthenticated, pathname, router, user])

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return <>{children}</>
}
