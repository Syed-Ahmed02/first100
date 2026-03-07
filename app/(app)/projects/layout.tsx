"use client"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
