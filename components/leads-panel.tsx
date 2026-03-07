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
import {
  RiUserLine,
  RiBuildingLine,
  RiMailLine,
  RiLinkedinBoxLine,
} from "@remixicon/react"

// ── Types ────────────────────────────────────────────────────────────────────

interface LeadData {
  _id: string
  firstName: string
  lastName: string
  title?: string
  email?: string
  linkedinUrl?: string
  companyName?: string
  companyDomain?: string
  companyDescription?: string
  companySize?: string
  industry?: string
  source: string
  confidence?: number
}

interface LeadsPanelProps {
  leads: LeadData[] | undefined
  isLoading?: boolean
}

// ── Component ────────────────────────────────────────────────────────────────

export function LeadsPanel({ leads, isLoading }: LeadsPanelProps) {
  if (isLoading || leads === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads</CardTitle>
          <CardDescription>Qualified lead contacts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (leads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads</CardTitle>
          <CardDescription>Qualified lead contacts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No leads generated yet. Run the pipeline to discover qualified
            contacts matching your ICP.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leads</CardTitle>
        <CardDescription>
          {leads.length} lead{leads.length !== 1 ? "s" : ""} found
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {leads.map((lead) => (
            <div
              key={lead._id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              {/* Avatar placeholder */}
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {lead.firstName[0]}
                {lead.lastName[0]}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {lead.firstName} {lead.lastName}
                  </p>
                  {lead.confidence !== undefined && (
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {Math.round(lead.confidence * 100)}%
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {lead.title && (
                    <span className="flex items-center gap-1 truncate">
                      <RiUserLine className="h-3 w-3" />
                      {lead.title}
                    </span>
                  )}
                  {lead.companyName && (
                    <span className="flex items-center gap-1 truncate">
                      <RiBuildingLine className="h-3 w-3" />
                      {lead.companyName}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
                    title={lead.email}
                  >
                    <RiMailLine className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
                {lead.linkedinUrl && (
                  <a
                    href={lead.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
                    title="LinkedIn"
                  >
                    <RiLinkedinBoxLine className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
