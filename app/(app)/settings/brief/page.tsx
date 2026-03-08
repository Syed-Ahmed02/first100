"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function BriefSettingsPage() {
  const router = useRouter()
  const user = useQuery(api.users.me)
  const updateBrief = useMutation(api.users.updateBrief)
  const createRun = useMutation(api.workflows.createRun)

  const [goals, setGoals] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)

  const isReady = user !== undefined && user !== null
  const canSubmit = productDescription.trim().length > 0 && goals.trim().length > 0

  useEffect(() => {
    if (!user) return
    setGoals(user.goals ?? "")
    setProductDescription(user.productDescription ?? "")
    setTargetAudience(user.targetAudience ?? "")
  }, [user])

  const hasChanges = useMemo(() => {
    if (!user) return false
    return (
      goals !== (user.goals ?? "") ||
      productDescription !== (user.productDescription ?? "") ||
      targetAudience !== (user.targetAudience ?? "")
    )
  }, [goals, productDescription, targetAudience, user])

  if (user === undefined) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Loading your brief...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) return null

  async function handleSave() {
    if (!canSubmit) return
    setSaving(true)
    try {
      await updateBrief({
        goals: goals.trim(),
        productDescription: productDescription.trim(),
        targetAudience: targetAudience.trim() || undefined,
      })
      toast.success("Brief updated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update brief"
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAndRun() {
    if (!canSubmit || !isReady) return
    setRunning(true)
    try {
      await updateBrief({
        goals: goals.trim(),
        productDescription: productDescription.trim(),
        targetAudience: targetAudience.trim() || undefined,
      })

      const runId = await createRun({})

      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          runId,
          productDescription: productDescription.trim(),
          targetAudience: targetAudience.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to start pipeline")
      }

      toast.success("Pipeline started with updated brief")
      router.push("/research")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to run pipeline"
      )
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" className="px-0" onClick={() => router.push("/research")}>
        Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Edit GTM Brief</CardTitle>
          <CardDescription>
            Update your product context, then optionally trigger a fresh full
            pipeline run.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goals">Goals</Label>
            <Textarea
              id="goals"
              value={goals}
              onChange={(event) => setGoals(event.target.value)}
              placeholder="What outcomes are you trying to achieve?"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-description">Product Description</Label>
            <Textarea
              id="product-description"
              value={productDescription}
              onChange={(event) => setProductDescription(event.target.value)}
              placeholder="Describe your product clearly"
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-audience">Target Audience</Label>
            <Input
              id="target-audience"
              value={targetAudience}
              onChange={(event) => setTargetAudience(event.target.value)}
              placeholder="e.g. B2B SaaS founders, RevOps leads"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void handleSave()}
              disabled={saving || running || !canSubmit || !hasChanges}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              onClick={() => void handleSaveAndRun()}
              disabled={saving || running || !canSubmit}
            >
              {running ? "Saving + Starting..." : "Save + Run Full Pipeline"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
