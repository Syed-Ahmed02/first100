"use client"

import { useState } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { api } from "@/convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

const onboardingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  goals: z.string().min(1, "Please describe your goals"),
  productDescription: z.string().min(1, "Please describe your product"),
  targetAudience: z.string().optional(),
})

type OnboardingValues = z.infer<typeof onboardingSchema>

type Step = "ask" | "form" | "connect"

export default function OnboardingPage() {
  const { user: auth0User } = useAuth0()
  const router = useRouter()
  const convexUser = useQuery(api.users.me)
  const completeOnboarding = useMutation(api.users.completeOnboarding)

  const [step, setStep] = useState<Step>("ask")
  const [askInput, setAskInput] = useState("")
  const [gmailConnected, setGmailConnected] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<OnboardingValues | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OnboardingValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(onboardingSchema as any),
    defaultValues: {
      name: auth0User?.name ?? "",
      goals: "",
      productDescription: "",
      targetAudience: "",
    },
  })

  // If already onboarded, redirect
  if (convexUser?.onboardingComplete) {
    router.replace("/dashboard")
    return null
  }

  function handleAskSubmit() {
    // Pre-fill goals from the ask input
    if (askInput.trim()) {
      setValue("goals", askInput.trim())
    }
    setStep("form")
  }

  async function onFormSubmit(data: OnboardingValues) {
    setFormData(data)
    setStep("connect")
  }

  async function finishSetup() {
    if (!formData) return
    setSubmitting(true)
    setError(null)
    try {
      await completeOnboarding({
        name: formData.name,
        goals: formData.goals,
        productDescription: formData.productDescription,
        targetAudience: formData.targetAudience || undefined,
        gmailConnected,
      })
      router.replace("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className={step === "ask" ? "font-medium text-foreground" : ""}>
            1. Ask
          </span>
          <span>/</span>
          <span
            className={step === "form" ? "font-medium text-foreground" : ""}
          >
            2. Details
          </span>
          <span>/</span>
          <span
            className={step === "connect" ? "font-medium text-foreground" : ""}
          >
            3. Connect
          </span>
        </div>

        {/* Step 1: Ask */}
        {step === "ask" && (
          <Card>
            <CardHeader>
              <CardTitle>What brings you here?</CardTitle>
              <CardDescription>
                Tell us what you&apos;re looking to accomplish. We&apos;ll help
                set things up for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Textarea
                placeholder="e.g. I want to run a GTM campaign for my new SaaS product..."
                value={askInput}
                onChange={(e) => setAskInput(e.target.value)}
                rows={4}
              />
              <Button onClick={handleAskSubmit}>Continue</Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Form */}
        {step === "form" && (
          <Card>
            <CardHeader>
              <CardTitle>Tell us about yourself</CardTitle>
              <CardDescription>
                Fill in a few details so we can personalize your experience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit(onFormSubmit)}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name or company name"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="goals">Goals</Label>
                  <Textarea
                    id="goals"
                    placeholder="What do you want to achieve?"
                    rows={3}
                    {...register("goals")}
                  />
                  {errors.goals && (
                    <p className="text-xs text-destructive">
                      {errors.goals.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="productDescription">
                    Product description
                  </Label>
                  <Textarea
                    id="productDescription"
                    placeholder="Describe your product or service"
                    rows={3}
                    {...register("productDescription")}
                  />
                  {errors.productDescription && (
                    <p className="text-xs text-destructive">
                      {errors.productDescription.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="targetAudience">
                    Target audience{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="targetAudience"
                    placeholder="e.g. B2B SaaS founders, marketing teams..."
                    {...register("targetAudience")}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("ask")}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1">
                    Continue
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Connect apps */}
        {step === "connect" && (
          <Card>
            <CardHeader>
              <CardTitle>Connect your apps</CardTitle>
              <CardDescription>
                Link your accounts to power outreach and campaigns.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Gmail</p>
                  <p className="text-xs text-muted-foreground">
                    Connect for email outreach
                  </p>
                </div>
                {gmailConnected ? (
                  <Badge variant="secondary">Connected</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setGmailConnected(true)}
                  >
                    Connect
                  </Button>
                )}
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("form")}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={finishSetup}
                  disabled={submitting}
                >
                  {submitting ? "Setting up..." : "Finish setup"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
