"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  WorkflowProgressBar,
  type WorkflowStep,
} from "@/components/workflow-status"
import { AgentRunTimeline } from "@/components/agent-run-timeline"
import { StreamingStepState } from "@/components/streaming-step-state"
import { IcpPanel } from "@/components/icp-panel"
import { PainPointsPanel } from "@/components/pain-points-panel"
import { DiscussionSourcesPanel } from "@/components/discussion-sources-panel"
import { MessagingPanel } from "@/components/messaging-panel"
import { LeadsPanel } from "@/components/leads-panel"
import { OutreachPanel } from "@/components/outreach-panel"
import { STEP_DISPLAY } from "@/lib/validation"
import type { PipelineStep } from "@/lib/validation"
import { RiRefreshLine } from "@remixicon/react"

const validTabs = [
  "overview",
  "icp",
  "sources",
  "pain-points",
  "messaging",
  "leads",
  "outreach",
  "pipeline",
] as const

type ResearchTab = (typeof validTabs)[number]

const statusVariant = {
  pending: "outline",
  running: "default",
  completed: "secondary",
  failed: "destructive",
  cancelled: "outline",
} as const

export default function ResearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const user = useQuery(api.users.me)
  const latestRun = useQuery(api.workflows.getLatestRun)
  const steps = useQuery(api.workflows.getCurrentUserSteps)
  const icpProfiles = useQuery(api.research.getIcpProfiles)
  const discussionSources = useQuery(api.research.getDiscussionSources)
  const painPoints = useQuery(api.research.getPainPoints)
  const messagingAngles = useQuery(api.messaging.getMessagingAngles)
  const leads = useQuery(api.leads.getLeads)
  const outreachDrafts = useQuery(api.outreach.getDrafts)
  const resetRunFromStep = useMutation(api.workflows.resetRunFromStep)

  const autoStartedRunIdRef = useRef<string | null>(null)
  const [retryingStep, setRetryingStep] = useState<PipelineStep | null>(null)

  const activeTab = useMemo<ResearchTab>(() => {
    const tab = searchParams.get("tab")
    return validTabs.includes(tab as ResearchTab)
      ? (tab as ResearchTab)
      : "overview"
  }, [searchParams])

  useEffect(() => {
    if (user && !user.onboardingComplete) {
      router.replace("/onboarding")
    }
  }, [router, user])

  useEffect(() => {
    if (!user || !latestRun || latestRun.status !== "pending") return
    if (!user.productDescription) return
    if (autoStartedRunIdRef.current === latestRun._id) return

    autoStartedRunIdRef.current = latestRun._id

    void fetch("/api/pipeline/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user._id,
        runId: latestRun._id,
        productDescription: user.productDescription,
        targetAudience: user.targetAudience ?? "",
      }),
    }).then(async (response) => {
      if (!response.ok) {
        autoStartedRunIdRef.current = null
      }
    })
  }, [latestRun, user])

  const currentStep = latestRun?.currentStep as PipelineStep | undefined
  const runningStepDisplay = currentStep ? STEP_DISPLAY[currentStep] : null
  const stepCount = steps?.length ?? 0
  const completedCount =
    steps?.filter((step) => step.status === "completed").length ?? 0
  const failedSteps =
    steps?.filter((step) => step.status === "failed") ?? []

  const firstName =
    user?.name?.trim().split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    "there"

  if (user === undefined || latestRun === undefined || steps === undefined) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Card>
          <CardContent className="py-12">
            <p className="text-sm text-muted-foreground">
              Loading your research workspace...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null
  }

  async function handleRetryStep(step: PipelineStep) {
    const currentUser = user
    const currentRun = latestRun

    if (!currentRun || !currentUser?.productDescription) return

    setRetryingStep(step)

    try {
      const resetResult = await resetRunFromStep({
        runId: currentRun._id,
        step,
      })

      const response = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser._id,
          runId: currentRun._id,
          productDescription: currentUser.productDescription,
          targetAudience: currentUser.targetAudience ?? "",
          startFromStep: resetResult.startStep,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? "Failed to retry step")
      }

      toast.success("Retry started", {
        description: `${STEP_DISPLAY[step].label} is running again.`,
      })
    } catch (error) {
      toast.error("Retry failed", {
        description:
          error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setRetryingStep(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Research workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Hi {firstName}, your agents are working.
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Outputs appear here as each agent step completes, from research to
            messaging, leads, and outreach drafts.
          </p>
        </div>
        {latestRun && (
          <Badge
            variant={statusVariant[latestRun.status] ?? "outline"}
            className="w-fit capitalize"
          >
            {latestRun.status}
          </Badge>
        )}
      </div>

      {user.productDescription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Research brief</CardTitle>
            <CardDescription>
              This is the context your agents are processing asynchronously.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Product
              </p>
              <p className="text-sm">{user.productDescription}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Target audience
              </p>
              <p className="text-sm text-muted-foreground">
                {user.targetAudience || "Not provided"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!latestRun ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No research run yet</CardTitle>
            <CardDescription>
              Complete onboarding to create your first async research run.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {steps.length > 0 && (
            <AgentRunTimeline
              events={steps.map((step) => ({
                step: step.step as PipelineStep,
                status: step.status as
                  | "pending"
                  | "running"
                  | "completed"
                  | "failed"
                  | "skipped",
                startedAt: step.startedAt,
                completedAt: step.completedAt,
                durationMs: step.durationMs,
                error: step.error,
              }))}
            />
          )}

          {latestRun.status === "running" && runningStepDisplay && (
            <StreamingStepState
              stepLabel={runningStepDisplay.label}
              isActive={true}
              message={runningStepDisplay.description}
            />
          )}

          {steps.length > 0 && (
            <WorkflowProgressBar
              steps={steps.map((step) => ({
                _id: step._id,
                step: step.step as PipelineStep,
                status: step.status as WorkflowStep["status"],
                startedAt: step.startedAt,
                completedAt: step.completedAt,
                durationMs: step.durationMs,
                error: step.error,
              }))}
            />
          )}

          {failedSteps.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base">Failed steps</CardTitle>
                <CardDescription>
                  Retry a failed step to continue the pipeline from the closest
                  valid checkpoint.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {failedSteps.map((step) => {
                  const display = STEP_DISPLAY[step.step as PipelineStep]

                  return (
                    <div
                      key={step._id}
                      className="flex flex-col gap-3 rounded-lg border border-destructive/20 p-4 md:flex-row md:items-start md:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {display?.label ?? step.step}
                          </p>
                          <Badge variant="destructive">Failed</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {display?.description ?? "Agent step"}
                        </p>
                        {step.error && (
                          <p className="text-xs text-destructive">
                            {step.error}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={retryingStep !== null}
                        onClick={() =>
                          handleRetryStep(step.step as PipelineStep)
                        }
                      >
                        <RiRefreshLine
                          className={`mr-1 h-4 w-4 ${
                            retryingStep === step.step ? "animate-spin" : ""
                          }`}
                        />
                        {retryingStep === step.step ? "Retrying..." : "Retry step"}
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-semibold">{completedCount}</p>
                <p className="text-sm text-muted-foreground">
                  Completed steps
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-semibold">{icpProfiles?.length ?? 0}</p>
                <p className="text-sm text-muted-foreground">
                  ICP segments found
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-semibold">{painPoints?.length ?? 0}</p>
                <p className="text-sm text-muted-foreground">
                  Pain points synthesized
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-semibold">
                  {discussionSources?.length ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Sources collected</p>
              </CardContent>
            </Card>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => router.replace(`/research?tab=${value}`)}
          >
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="icp">ICP</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="pain-points">Pain Points</TabsTrigger>
              <TabsTrigger value="messaging">Messaging</TabsTrigger>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="outreach">Outreach</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <IcpPanel profiles={icpProfiles as never} />
              <DiscussionSourcesPanel sources={discussionSources as never} />
              <PainPointsPanel painPoints={painPoints as never} />
              <MessagingPanel angles={messagingAngles as never} />
              <LeadsPanel leads={leads as never} />
              <OutreachPanel drafts={outreachDrafts as never} />
            </TabsContent>

            <TabsContent value="icp" className="mt-4">
              <IcpPanel profiles={icpProfiles as never} />
            </TabsContent>

            <TabsContent value="pain-points" className="mt-4">
              <PainPointsPanel painPoints={painPoints as never} />
            </TabsContent>

            <TabsContent value="sources" className="mt-4">
              <DiscussionSourcesPanel sources={discussionSources as never} />
            </TabsContent>

            <TabsContent value="messaging" className="mt-4">
              <MessagingPanel angles={messagingAngles as never} />
            </TabsContent>

            <TabsContent value="leads" className="mt-4">
              <LeadsPanel leads={leads as never} />
            </TabsContent>

            <TabsContent value="outreach" className="mt-4">
              <OutreachPanel drafts={outreachDrafts as never} />
            </TabsContent>

            <TabsContent value="pipeline" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pipeline status</CardTitle>
                  <CardDescription>
                    {stepCount === 0
                      ? "Your workflow steps will appear here once the run is initialized."
                      : "Track the current async progress for this user-scoped run."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {steps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No workflow steps are available yet.
                    </p>
                  ) : (
                    steps.map((step) => {
                      const display = STEP_DISPLAY[step.step as PipelineStep]

                      return (
                        <div
                          key={step._id}
                          className="flex items-start justify-between gap-4 rounded-lg border p-4"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              {display?.label ?? step.step}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {display?.description ?? "Agent step"}
                            </p>
                            {step.error && (
                              <p className="text-xs text-destructive">
                                {step.error}
                              </p>
                            )}
                            {step.status === "failed" &&
                              latestRun.status !== "running" &&
                              user.productDescription && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2"
                                  disabled={retryingStep !== null}
                                  onClick={() =>
                                    handleRetryStep(step.step as PipelineStep)
                                  }
                                >
                                  <RiRefreshLine
                                    className={`mr-1 h-4 w-4 ${
                                      retryingStep === step.step
                                        ? "animate-spin"
                                        : ""
                                    }`}
                                  />
                                  {retryingStep === step.step
                                    ? "Retrying..."
                                    : "Retry step"}
                                </Button>
                              )}
                          </div>
                          <Badge
                            variant={
                              step.status === "failed"
                                ? "destructive"
                                : step.status === "running"
                                  ? "default"
                                  : step.status === "completed"
                                    ? "secondary"
                                    : "outline"
                            }
                            className="capitalize"
                          >
                            {step.status}
                          </Badge>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
