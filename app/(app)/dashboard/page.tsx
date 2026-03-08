"use client"

import { useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import {
  RiArrowRightUpLine,
  RiChat3Line,
  RiCompass3Line,
  RiFileChartLine,
  RiLightbulbFlashLine,
  RiPulseLine,
  RiSearchEyeLine,
} from "@remixicon/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const quickActions = [
  {
    title: "Latest Research",
    description: "See the newest async findings from your agents.",
    href: "/research",
    icon: RiSearchEyeLine,
  },
  {
    title: "ICP Segments",
    description: "Jump straight into the first research output.",
    href: "/research?tab=icp",
    icon: RiCompass3Line,
  },
  {
    title: "Pain Points",
    description: "Review synthesized complaints and evidence.",
    href: "/research?tab=pain-points",
    icon: RiPulseLine,
  },
  {
    title: "Pipeline Status",
    description: "Track which agent is running right now.",
    href: "/research?tab=pipeline",
    icon: RiFileChartLine,
  },
  {
    title: "Start a Chat",
    description: "Open the assistant for a new GTM conversation.",
    href: "/chat",
    icon: RiChat3Line,
  },
  {
    title: "Ideas",
    description: "Use chat to explore positioning and messaging ideas.",
    href: "/chat?q=Give%20me%203%20new%20GTM%20angles%20to%20test",
    icon: RiLightbulbFlashLine,
  },
] as const

export default function DashboardPage() {
  const user = useQuery(api.users.me)
  const router = useRouter()
  const [query, setQuery] = useState("")

  const firstName = useMemo(() => {
    if (!user) return "there"
    return user.name?.trim().split(/\s+/)[0] || user.email?.split("@")[0] || "there"
  }, [user])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = query.trim()
    if (!value) return
    router.push(`/chat?q=${encodeURIComponent(value)}`)
  }

  return (
    <div className="mx-auto flex min-h-[calc(100svh-8rem)] w-full max-w-5xl flex-col items-center justify-center">
      <div className="w-full max-w-4xl space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-2xl font-semibold tracking-tight">
            Hi {firstName}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            How can I help you today?
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 rounded-2xl border bg-background px-4 py-3 shadow-sm">
            <RiChat3Line className="h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask HundredUsers anything..."
              className="border-0 px-0 shadow-none focus-visible:ring-0"
            />
            <Button type="submit" size="sm" disabled={!query.trim()}>
              Open chat
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-medium">Quick Actions</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {quickActions.map((action) => (
              <Card
                key={action.title}
                className="cursor-pointer border-muted/70 transition-colors hover:bg-accent/40"
                onClick={() => router.push(action.href)}
              >
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <action.icon className="h-5 w-5" />
                    </div>
                    <RiArrowRightUpLine className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent />
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
