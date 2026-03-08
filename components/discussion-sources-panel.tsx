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
import { RiExternalLinkLine } from "@remixicon/react"

interface DiscussionSourceData {
  _id: string
  sourceType: "reddit" | "hackernews" | "forum" | "review_site" | "other"
  url: string
  title?: string
  body: string
  author?: string
  community?: string
  relevanceScore?: number
}

interface DiscussionSourcesPanelProps {
  sources: DiscussionSourceData[] | undefined
  isLoading?: boolean
}

const sourceTypeLabel: Record<DiscussionSourceData["sourceType"], string> = {
  reddit: "Reddit",
  hackernews: "Hacker News",
  forum: "Forum",
  review_site: "Review Site",
  other: "Other",
}

export function DiscussionSourcesPanel({
  sources,
  isLoading,
}: DiscussionSourcesPanelProps) {
  if (isLoading || sources === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sources</CardTitle>
          <CardDescription>Discussion evidence used for synthesis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (sources.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sources</CardTitle>
          <CardDescription>Discussion evidence used for synthesis</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No sources stored yet. Run the pipeline to collect evidence.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sources</CardTitle>
        <CardDescription>
          {sources.length} evidence source{sources.length === 1 ? "" : "s"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sources.map((source) => (
          <div key={source._id} className="space-y-2 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {source.title || source.community || "Untitled source"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {source.community || "Unknown community"}
                  {source.author ? ` • ${source.author}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{sourceTypeLabel[source.sourceType]}</Badge>
                {typeof source.relevanceScore === "number" && (
                  <Badge variant="secondary">
                    {Math.round(source.relevanceScore * 100)}%
                  </Badge>
                )}
              </div>
            </div>

            <p className="line-clamp-4 text-sm text-muted-foreground">{source.body}</p>

            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
            >
              Open source
              <RiExternalLinkLine className="h-3 w-3" />
            </a>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
