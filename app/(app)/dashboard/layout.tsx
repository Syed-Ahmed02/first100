"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = useQuery(api.users.me)

  // If user hasn't completed onboarding, don't show dashboard shell
  // (the (app) layout will redirect them)
  if (user && !user.onboardingComplete) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-svh">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
