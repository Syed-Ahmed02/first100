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
  RiSkipForwardLine,
} from "@remixicon/react"

// ── Types ────────────────────────────────────────────────────────────────────

export interface WorkflowStep {
  _id: string
  step: PipelineStep
  status: StepStatus
  startedAt?: number
  completedAt?: number
  durationMs?: number
  error?: string
}

interface WorkflowStatusProps {
  steps: WorkflowStep[]
  className?: string
}

// ── Status helpers ───────────────────────────────────────────────────────────

const statusIcon: Record<StepStatus, React.ReactNode> = {
  pending: <RiTimeLine className="h-4 w-4 text-muted-foreground" />,
  running: <RiLoader4Line className="h-4 w-4 animate-spin text-blue-500" />,
  completed: <RiCheckLine className="h-4 w-4 text-green-500" />,
  failed: <RiCloseLine className="h-4 w-4 text-red-500" />,
  skipped: <RiSkipForwardLine className="h-4 w-4 text-muted-foreground" />,
}

const statusLabel: Record<StepStatus, string> = {
  pending: "Pending",
  running: "Running",
  completed: "Complete",
  failed: "Failed",
  skipped: "Skipped",
}

const statusColor: Record<StepStatus, string> = {
  pending: "bg-muted",
  running: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  skipped: "bg-muted",
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Displays the GTM pipeline as a vertical step timeline.
 * Shows status, duration, and errors for each step.
 */
export function WorkflowStatus({ steps, className }: WorkflowStatusProps) {
  // Sort steps by pipeline order
  const sortedSteps = [...steps].sort((a, b) => {
    const aOrder = STEP_DISPLAY[a.step]?.order ?? 99
    const bOrder = STEP_DISPLAY[b.step]?.order ?? 99
    return aOrder - bOrder
  })

  return (
    <div className={cn("flex flex-col gap-0", className)}>
      {sortedSteps.map((step, index) => {
        const display = STEP_DISPLAY[step.step]
        const isLast = index === sortedSteps.length - 1

        return (
          <div key={step._id} className="flex gap-3">
            {/* Vertical line + icon */}
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background">
                {statusIcon[step.status]}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "min-h-4 w-0.5 flex-1",
                    step.status === "completed"
                      ? "bg-green-500/30"
                      : "bg-border"
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {display?.label ?? step.step}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    step.status === "running" && "bg-blue-500/10 text-blue-600",
                    step.status === "completed" &&
                      "bg-green-500/10 text-green-600",
                    step.status === "failed" && "bg-red-500/10 text-red-600",
                    step.status === "pending" &&
                      "bg-muted text-muted-foreground",
                    step.status === "skipped" &&
                      "bg-muted text-muted-foreground"
                  )}
                >
                  {statusLabel[step.status]}
                </span>
                {step.durationMs && (
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(step.durationMs)}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {display?.description ?? ""}
              </p>
              {step.error && (
                <p className="mt-1 text-xs text-red-500">{step.error}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Progress bar variant ─────────────────────────────────────────────────────

interface WorkflowProgressBarProps {
  steps: WorkflowStep[]
  className?: string
}

/**
 * Compact horizontal progress bar showing pipeline completion.
 */
export function WorkflowProgressBar({
  steps,
  className,
}: WorkflowProgressBarProps) {
  const total = steps.length
  const completed = steps.filter((s) => s.status === "completed").length
  const running = steps.filter((s) => s.status === "running").length
  const failed = steps.filter((s) => s.status === "failed").length

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Pipeline progress</span>
        <span className="font-medium">
          {completed}/{total} steps
          {running > 0 && (
            <span className="ml-1 text-blue-500">({running} running)</span>
          )}
          {failed > 0 && (
            <span className="ml-1 text-red-500">({failed} failed)</span>
          )}
        </span>
      </div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {steps
          .sort(
            (a, b) =>
              (STEP_DISPLAY[a.step]?.order ?? 99) -
              (STEP_DISPLAY[b.step]?.order ?? 99)
          )
          .map((step) => (
            <div
              key={step._id}
              className={cn(
                "flex-1 rounded-full transition-colors",
                statusColor[step.status]
              )}
            />
          ))}
      </div>
    </div>
  )
}
