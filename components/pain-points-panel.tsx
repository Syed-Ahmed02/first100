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
  RiEmotionUnhappyLine,
  RiBarChartLine,
  RiExternalLinkLine,
} from "@remixicon/react"

// ── Types ────────────────────────────────────────────────────────────────────

interface EvidenceSnippet {
  sourceId: string
  quote: string
  url: string
}

interface PainPointData {
  _id: string
  theme: string
  description: string
  category?: string
  frequency: number
  sentiment: "very_negative" | "negative" | "neutral" | "mixed"
  confidenceScore: number
  evidenceSnippets: EvidenceSnippet[]
}

interface PainPointsPanelProps {
  painPoints: PainPointData[] | undefined
  isLoading?: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const sentimentLabel: Record<string, string> = {
  very_negative: "Very Negative",
  negative: "Negative",
  neutral: "Neutral",
  mixed: "Mixed",
}

const sentimentColor: Record<string, string> = {
  very_negative: "bg-red-500/10 text-red-600",
  negative: "bg-orange-500/10 text-orange-600",
  neutral: "bg-muted text-muted-foreground",
  mixed: "bg-yellow-500/10 text-yellow-600",
}

// ── Component ────────────────────────────────────────────────────────────────

export function PainPointsPanel({
  painPoints,
  isLoading,
}: PainPointsPanelProps) {
  if (isLoading || painPoints === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pain Points</CardTitle>
          <CardDescription>
            Clustered complaints and frustrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (painPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pain Points</CardTitle>
          <CardDescription>
            Clustered complaints and frustrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No pain points synthesized yet. Evidence will be clustered into
            themes once research completes.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Sort by frequency descending
  const sorted = [...painPoints].sort((a, b) => b.frequency - a.frequency)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pain Points</CardTitle>
        <CardDescription>
          {painPoints.length} pain point{painPoints.length !== 1 ? "s" : ""}{" "}
          identified from online discussions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sorted.map((pp) => (
            <div key={pp._id} className="space-y-3 rounded-lg border p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <RiEmotionUnhappyLine className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <h4 className="text-sm font-medium">{pp.theme}</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {pp.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {pp.category && (
                  <Badge variant="outline" className="text-xs">
                    {pp.category}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`text-xs ${sentimentColor[pp.sentiment] ?? ""}`}
                >
                  {sentimentLabel[pp.sentiment] ?? pp.sentiment}
                </Badge>
                <div className="flex items-center gap-1">
                  <RiBarChartLine className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {pp.frequency} source{pp.frequency !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(pp.confidenceScore * 100)}% confidence
                </span>
              </div>

              {/* Evidence snippets */}
              {pp.evidenceSnippets.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Evidence
                  </p>
                  {pp.evidenceSnippets.slice(0, 3).map((snippet, i) => (
                    <div
                      key={i}
                      className="rounded border-l-2 border-muted-foreground/20 bg-muted/50 px-3 py-2"
                    >
                      <p className="text-xs italic">
                        &ldquo;{snippet.quote}&rdquo;
                      </p>
                      <a
                        href={snippet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
                      >
                        Source
                        <RiExternalLinkLine className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                  {pp.evidenceSnippets.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{pp.evidenceSnippets.length - 3} more evidence snippets
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
