"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { RiMailLine, RiLinkedinBoxLine, RiFileCopyLine } from "@remixicon/react"
import { toast } from "sonner"

// ── Types ────────────────────────────────────────────────────────────────────

interface OutreachDraftData {
  _id: string
  channel: "email" | "linkedin" | "twitter" | "other"
  subject?: string
  body: string
  status: "draft" | "approved" | "sent" | "rejected"
  version: number
  leadId: string
  // Joined lead info (optional, for display)
  leadName?: string
  leadCompany?: string
}

interface OutreachPanelProps {
  drafts: OutreachDraftData[] | undefined
  isLoading?: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const channelIcon: Record<string, React.ReactNode> = {
  email: <RiMailLine className="h-4 w-4" />,
  linkedin: <RiLinkedinBoxLine className="h-4 w-4" />,
  twitter: <span className="text-xs font-bold">X</span>,
  other: <RiMailLine className="h-4 w-4" />,
}

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-green-500/10 text-green-600",
  sent: "bg-blue-500/10 text-blue-600",
  rejected: "bg-red-500/10 text-red-600",
}

// ── Component ────────────────────────────────────────────────────────────────

export function OutreachPanel({ drafts, isLoading }: OutreachPanelProps) {
  if (isLoading || drafts === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outreach</CardTitle>
          <CardDescription>Personalized outbound drafts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (drafts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outreach</CardTitle>
          <CardDescription>Personalized outbound drafts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No outreach drafts created yet. Run the full pipeline to generate
            personalized messages for each lead.
          </p>
        </CardContent>
      </Card>
    )
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Outreach</CardTitle>
        <CardDescription>
          {drafts.length} draft{drafts.length !== 1 ? "s" : ""} generated
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div key={draft._id} className="space-y-3 rounded-lg border p-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {channelIcon[draft.channel]}
                  <span className="text-sm font-medium capitalize">
                    {draft.channel}
                  </span>
                  {draft.leadName && (
                    <span className="text-xs text-muted-foreground">
                      to {draft.leadName}
                      {draft.leadCompany && ` at ${draft.leadCompany}`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${statusColor[draft.status] ?? ""}`}
                  >
                    {draft.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    v{draft.version}
                  </span>
                </div>
              </div>

              {/* Subject */}
              {draft.subject && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Subject
                  </p>
                  <p className="text-sm">{draft.subject}</p>
                </div>
              )}

              {/* Body */}
              <div className="relative">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Body
                </p>
                <div className="rounded bg-muted/50 p-3">
                  <p className="text-xs whitespace-pre-wrap">{draft.body}</p>
                </div>
                <button
                  onClick={() =>
                    handleCopy(
                      draft.subject
                        ? `Subject: ${draft.subject}\n\n${draft.body}`
                        : draft.body
                    )
                  }
                  className="absolute top-7 right-2 flex h-7 w-7 items-center justify-center rounded-md bg-background hover:bg-muted"
                  title="Copy draft"
                >
                  <RiFileCopyLine className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
