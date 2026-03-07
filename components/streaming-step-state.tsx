"use client"

import { cn } from "@/lib/utils"
import { RiLoader4Line } from "@remixicon/react"

// ── Types ────────────────────────────────────────────────────────────────────

interface StreamingStepStateProps {
  stepLabel: string
  isActive: boolean
  message?: string
  className?: string
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Displays a loading/streaming state for an active pipeline step.
 * Shows a pulsing indicator and optional status message.
 */
export function StreamingStepState({
  stepLabel,
  isActive,
  message,
  className,
}: StreamingStepStateProps) {
  if (!isActive) return null

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3",
        className
      )}
    >
      <RiLoader4Line className="h-5 w-5 animate-spin text-blue-500" />
      <div className="flex-1">
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {stepLabel}
        </p>
        {message && (
          <p className="mt-0.5 text-xs text-muted-foreground">{message}</p>
        )}
      </div>
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500 [animation-delay:0.2s]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500 [animation-delay:0.4s]" />
      </div>
    </div>
  )
}
