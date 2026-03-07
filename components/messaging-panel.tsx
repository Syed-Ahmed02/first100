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
import { RiLightbulbLine, RiMegaphoneLine } from "@remixicon/react"

// ── Types ────────────────────────────────────────────────────────────────────

interface MessagingAngleData {
  _id: string
  angle: string
  valueProp: string
  hooks: string[]
  ctaVariants?: string[]
  landingPageCopy?: string
  targetSegment?: string
  channel?: string
}

interface MessagingPanelProps {
  angles: MessagingAngleData[] | undefined
  isLoading?: boolean
}

// ── Component ────────────────────────────────────────────────────────────────

export function MessagingPanel({ angles, isLoading }: MessagingPanelProps) {
  if (isLoading || angles === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Messaging</CardTitle>
          <CardDescription>
            Campaign angles and value propositions
          </CardDescription>
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

  if (angles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Messaging</CardTitle>
          <CardDescription>
            Campaign angles and value propositions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No messaging angles generated yet. Run the pipeline to generate
            positioning and campaign copy.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Messaging</CardTitle>
        <CardDescription>
          {angles.length} messaging angle{angles.length !== 1 ? "s" : ""}{" "}
          generated
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {angles.map((angle) => (
            <div key={angle._id} className="space-y-3 rounded-lg border p-4">
              {/* Header */}
              <div className="flex items-start gap-2">
                <RiMegaphoneLine className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{angle.angle}</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {angle.valueProp}
                  </p>
                </div>
              </div>

              {/* Meta badges */}
              <div className="flex flex-wrap gap-2">
                {angle.targetSegment && (
                  <Badge variant="outline" className="text-xs">
                    {angle.targetSegment}
                  </Badge>
                )}
                {angle.channel && (
                  <Badge variant="secondary" className="text-xs">
                    {angle.channel}
                  </Badge>
                )}
              </div>

              {/* Hooks */}
              {angle.hooks.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Hooks
                  </p>
                  <div className="space-y-1">
                    {angle.hooks.map((hook, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <RiLightbulbLine className="mt-0.5 h-3 w-3 text-yellow-500" />
                        <p className="text-xs">{hook}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA variants */}
              {angle.ctaVariants && angle.ctaVariants.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    CTAs
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {angle.ctaVariants.map((cta, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {cta}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
