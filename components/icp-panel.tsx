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
import { RiUserLine, RiBuildingLine, RiMapPinLine } from "@remixicon/react"

// ── Types ────────────────────────────────────────────────────────────────────

interface IcpProfile {
  _id: string
  segmentName: string
  isPrimary: boolean
  jobTitles: string[]
  seniorityLevels?: string[]
  industries: string[]
  companySizeRange?: string
  geographies?: string[]
  responsibilities?: string[]
  goals?: string[]
  challenges?: string[]
  confidenceScore?: number
  reasoning?: string
}

interface IcpPanelProps {
  profiles: IcpProfile[] | undefined
  isLoading?: boolean
}

// ── Component ────────────────────────────────────────────────────────────────

export function IcpPanel({ profiles, isLoading }: IcpPanelProps) {
  if (isLoading || profiles === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ICP Research</CardTitle>
          <CardDescription>Ideal customer profile segments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (profiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ICP Research</CardTitle>
          <CardDescription>Ideal customer profile segments</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No ICP segments generated yet. Run the pipeline to identify your
            ideal customer profiles.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ICP Research</CardTitle>
        <CardDescription>
          {profiles.length} segment{profiles.length !== 1 ? "s" : ""} identified
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {profiles.map((profile) => (
            <div key={profile._id} className="space-y-3 rounded-lg border p-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{profile.segmentName}</h4>
                <div className="flex items-center gap-2">
                  {profile.isPrimary && (
                    <Badge variant="default" className="text-xs">
                      Primary
                    </Badge>
                  )}
                  {profile.confidenceScore !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round(profile.confidenceScore * 100)}% confidence
                    </Badge>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {/* Job titles */}
                <div className="flex items-start gap-2">
                  <RiUserLine className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Roles
                    </p>
                    <p className="text-xs">{profile.jobTitles.join(", ")}</p>
                  </div>
                </div>

                {/* Industries */}
                <div className="flex items-start gap-2">
                  <RiBuildingLine className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Industries
                    </p>
                    <p className="text-xs">{profile.industries.join(", ")}</p>
                  </div>
                </div>

                {/* Company size */}
                {profile.companySizeRange && (
                  <div className="flex items-start gap-2">
                    <RiBuildingLine className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Company size
                      </p>
                      <p className="text-xs">
                        {profile.companySizeRange} employees
                      </p>
                    </div>
                  </div>
                )}

                {/* Geographies */}
                {profile.geographies && profile.geographies.length > 0 && (
                  <div className="flex items-start gap-2">
                    <RiMapPinLine className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Geographies
                      </p>
                      <p className="text-xs">
                        {profile.geographies.join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Challenges */}
              {profile.challenges && profile.challenges.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Challenges
                  </p>
                  <ul className="space-y-0.5">
                    {profile.challenges.map((challenge, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        &bull; {challenge}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reasoning */}
              {profile.reasoning && (
                <p className="text-xs text-muted-foreground italic">
                  {profile.reasoning}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
