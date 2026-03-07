"use client"

import { cn } from "@/lib/utils"
import {
  STEP_DISPLAY,
  type PipelineStep,
  type StepStatus,
} from "@/lib/validation"
import {
  RiCheckLine,
  RiLoader4Line,
  RiCloseLine,
  RiTimeLine,
} from "@remixicon/react"

// ── Types ────────────────────────────────────────────────────────────────────

interface TimelineEvent {
  step: PipelineStep
  status: StepStatus
  startedAt?: number
  completedAt?: number
  durationMs?: number
  error?: string
}

interface AgentRunTimelineProps {
  events: TimelineEvent[]
  className?: string
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Horizontal timeline showing agent execution history for a workflow run.
 * Compact view suitable for dashboard headers.
 */
export function AgentRunTimeline({ events, className }: AgentRunTimelineProps) {
  const sorted = [...events].sort(
    (a, b) =>
      (STEP_DISPLAY[a.step]?.order ?? 99) - (STEP_DISPLAY[b.step]?.order ?? 99)
  )

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {sorted.map((event, index) => {
        const display = STEP_DISPLAY[event.step]
        const isLast = index === sorted.length - 1

        return (
          <div key={event.step} className="flex items-center gap-1">
            <div
              className={cn(
                "group relative flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
                event.status === "completed" &&
                  "border-green-500 bg-green-500/10",
                event.status === "running" && "border-blue-500 bg-blue-500/10",
                event.status === "failed" && "border-red-500 bg-red-500/10",
                event.status === "pending" && "border-border bg-muted",
                event.status === "skipped" && "border-border bg-muted"
              )}
              title={`${display?.label}: ${event.status}`}
            >
              {event.status === "completed" && (
                <RiCheckLine className="h-3.5 w-3.5 text-green-500" />
              )}
              {event.status === "running" && (
                <RiLoader4Line className="h-3.5 w-3.5 animate-spin text-blue-500" />
              )}
              {event.status === "failed" && (
                <RiCloseLine className="h-3.5 w-3.5 text-red-500" />
              )}
              {event.status === "pending" && (
                <RiTimeLine className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              {event.status === "skipped" && (
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              )}

              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                {display?.label}
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  "h-0.5 w-4",
                  event.status === "completed" ? "bg-green-500/30" : "bg-border"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
