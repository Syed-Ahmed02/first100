"use client"

import { useAuth0 } from "@auth0/auth0-react"
import { useConvexAuth } from "convex/react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { api } from "@/convex/_generated/api"
import { Skeleton } from "@/components/ui/skeleton"

export default function HomePage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth0()
  const { isLoading: convexLoading } = useConvexAuth()
  const router = useRouter()

  const user = useQuery(
    api.users.me,
    !authLoading && isAuthenticated ? {} : "skip"
  )
  const getOrCreate = useMutation(api.users.getOrCreate)

  // Ensure user record exists in Convex when authenticated
  useEffect(() => {
    if (isAuthenticated && user === null) {
      getOrCreate()
    }
  }, [isAuthenticated, user, getOrCreate])

  // Route based on auth + onboarding state
  useEffect(() => {
    if (authLoading || convexLoading) return

    // Not authenticated → login
    if (!isAuthenticated) {
      router.replace("/login")
      return
    }

    // Still loading user from Convex
    if (user === undefined) return

    // User exists and onboarding complete → research
    if (user && user.onboardingComplete) {
      router.replace("/research")
      return
    }

    // User exists but not onboarded → onboarding
    if (user && !user.onboardingComplete) {
      router.replace("/onboarding")
      return
    }
  }, [authLoading, convexLoading, isAuthenticated, user, router])

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  )
}
