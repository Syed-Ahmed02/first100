"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RiArrowLeftLine,
  RiPlayLine,
  RiRefreshLine,
} from "@remixicon/react"
import { WorkflowStatus, WorkflowProgressBar, type WorkflowStep } from "@/components/workflow-status"
import { AgentRunTimeline } from "@/components/agent-run-timeline"
import { StreamingStepState } from "@/components/streaming-step-state"
import { IcpPanel } from "@/components/icp-panel"
import { PainPointsPanel } from "@/components/pain-points-panel"
import { MessagingPanel } from "@/components/messaging-panel"
import { LeadsPanel } from "@/components/leads-panel"
import { OutreachPanel } from "@/components/outreach-panel"
import { STEP_DISPLAY } from "@/lib/validation"
import type { PipelineStep } from "@/lib/validation"

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as Id<"projects">

  // ── Queries ──────────────────────────────────────────────────────────────
  const project = useQuery(api.projects.get, { projectId })
  const latestRun = useQuery(api.workflows.getLatestRun, { projectId })
  const steps = useQuery(
    api.workflows.getProjectSteps,
    { projectId }
  )
  const icpProfiles = useQuery(api.research.getIcpProfiles, { projectId })
  const painPoints = useQuery(api.research.getPainPoints, { projectId })
  const messagingAngles = useQuery(api.messaging.getMessagingAngles, { projectId })
  const leads = useQuery(api.leads.getLeads, { projectId })
  const outreachDrafts = useQuery(api.outreach.getDrafts, { projectId })

  // ── Mutations ────────────────────────────────────────────────────────────
  const updateStatus = useMutation(api.projects.updateStatus)
  const createRun = useMutation(api.workflows.createRun)
  const startRun = useMutation(api.workflows.startRun)

  // ── Loading state ────────────────────────────────────────────────────────
  if (project === undefined) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="mb-2 h-4 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (project === null) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => router.push("/dashboard")}
        >
          <RiArrowLeftLine className="mr-1 h-4 w-4" />
          Back to dashboard
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Project not found or you don&apos;t have access.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Derived state ────────────────────────────────────────────────────────
  const hasRun = latestRun !== null && latestRun !== undefined
  const isRunning = latestRun?.status === "running"
  const currentStep = latestRun?.currentStep as PipelineStep | undefined
  const runningStepDisplay = currentStep ? STEP_DISPLAY[currentStep] : null

  const statusOptions = ["draft", "active", "paused", "completed"] as const

  async function handleStartPipeline() {
    if (!latestRun) return

    if (latestRun.status === "completed" || latestRun.status === "failed") {
      // Re-run: create a new run
      const newRunId = await createRun({ projectId })
      await startRun({ runId: newRunId })
    } else if (latestRun.status === "pending") {
      // First run: the run was created with the project, just start it
      await startRun({ runId: latestRun._id })
    }

    // Update project status to active
    if (project?.status === "draft") {
      await updateStatus({ projectId, status: "active" })
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => router.push("/dashboard")}
        >
          <RiArrowLeftLine className="mr-1 h-4 w-4" />
          Back to dashboard
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                project.status === "active"
                  ? "default"
                  : project.status === "completed"
                    ? "secondary"
                    : "outline"
              }
            >
              {project.status}
            </Badge>
            <Button
              size="sm"
              onClick={handleStartPipeline}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <RiRefreshLine className="mr-1 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : hasRun ? (
                <>
                  <RiRefreshLine className="mr-1 h-4 w-4" />
                  Re-run pipeline
                </>
              ) : (
                <>
                  <RiPlayLine className="mr-1 h-4 w-4" />
                  Start pipeline
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Agent timeline (compact) ────────────────────────────────────── */}
      {steps && steps.length > 0 && (
        <AgentRunTimeline
          events={steps.map((s) => ({
            step: s.step as PipelineStep,
            status: s.status as "pending" | "running" | "completed" | "failed" | "skipped",
            startedAt: s.startedAt,
            completedAt: s.completedAt,
            durationMs: s.durationMs,
            error: s.error,
          }))}
        />
      )}

      {/* ── Streaming indicator ─────────────────────────────────────────── */}
      {isRunning && runningStepDisplay && (
        <StreamingStepState
          stepLabel={runningStepDisplay.label}
          isActive={true}
          message={runningStepDisplay.description}
        />
      )}

      {/* ── Progress bar ────────────────────────────────────────────────── */}
      {steps && steps.length > 0 && (
        <WorkflowProgressBar
          steps={steps.map((s) => ({
            _id: s._id,
            step: s.step as PipelineStep,
            status: s.status as "pending" | "running" | "completed" | "failed" | "skipped",
            startedAt: s.startedAt,
            completedAt: s.completedAt,
            durationMs: s.durationMs,
            error: s.error,
          }))}
        />
      )}

      <Separator />

      {/* ── Main content tabs ───────────────────────────────────────────── */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="icp">ICP</TabsTrigger>
          <TabsTrigger value="pain-points">Pain Points</TabsTrigger>
          <TabsTrigger value="messaging">Messaging</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        {/* ── Overview tab ────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Project details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Product description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{project.productDescription}</p>
              </CardContent>
            </Card>

            {project.targetAudience && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Target audience</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{project.targetAudience}</p>
                </CardContent>
              </Card>
            )}

            {project.goals && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{project.goals}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{icpProfiles?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">ICP Segments</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{painPoints?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Pain Points</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{leads?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Leads</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{outreachDrafts?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Outreach Drafts</p>
              </CardContent>
            </Card>
          </div>

          {/* Status update */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project status</CardTitle>
              <CardDescription>
                Update the project lifecycle status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={project.status === status ? "default" : "outline"}
                    disabled={project.status === status}
                    onClick={() =>
                      updateStatus({ projectId: project._id, status })
                    }
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ICP tab ─────────────────────────────────────────────────── */}
        <TabsContent value="icp" className="mt-4">
          <IcpPanel profiles={icpProfiles as never} />
        </TabsContent>

        {/* ── Pain Points tab ─────────────────────────────────────────── */}
        <TabsContent value="pain-points" className="mt-4">
          <PainPointsPanel painPoints={painPoints as never} />
        </TabsContent>

        {/* ── Messaging tab ───────────────────────────────────────────── */}
        <TabsContent value="messaging" className="mt-4">
          <MessagingPanel angles={messagingAngles as never} />
        </TabsContent>

        {/* ── Leads tab ───────────────────────────────────────────────── */}
        <TabsContent value="leads" className="mt-4">
          <LeadsPanel leads={leads as never} />
        </TabsContent>

        {/* ── Outreach tab ────────────────────────────────────────────── */}
        <TabsContent value="outreach" className="mt-4">
          <OutreachPanel drafts={outreachDrafts as never} />
        </TabsContent>

        {/* ── Pipeline tab ────────────────────────────────────────────── */}
        <TabsContent value="pipeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline Steps</CardTitle>
              <CardDescription>
                Detailed view of each workflow step&apos;s status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {steps && steps.length > 0 ? (
                <WorkflowStatus
                  steps={steps.map((s) => ({
                    _id: s._id,
                    step: s.step as PipelineStep,
                    status: s.status as "pending" | "running" | "completed" | "failed" | "skipped",
                    startedAt: s.startedAt,
                    completedAt: s.completedAt,
                    durationMs: s.durationMs,
                    error: s.error,
                  }))}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No pipeline run started yet. Click &quot;Start pipeline&quot;
                  to begin the GTM workflow.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
