"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import type { UIMessage } from "ai"
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
import { cn } from "@/lib/utils"
import {
  RiSendPlaneFill,
  RiRobot2Line,
  RiUser3Line,
  RiArrowRightLine,
  RiStopCircleLine,
} from "@remixicon/react"

// --- Schema ---

const onboardingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  goals: z.string().min(1, "Please describe your goals"),
  productDescription: z.string().min(1, "Please describe your product"),
  targetAudience: z.string().optional(),
})

type OnboardingValues = z.infer<typeof onboardingSchema>

type Step = "ask" | "form" | "connect"

type ExtractedFields = {
  name?: string
  goals?: string
  productDescription?: string
  targetAudience?: string
}

/** Extract plain text from a UIMessage's parts array */
function getTextFromParts(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

/** Try to extract a ```json { ... } ``` block from text */
function extractJsonFields(text: string): ExtractedFields | null {
  const match = text.match(/```json\s*\n?([\s\S]*?)```/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1])
    if (typeof parsed !== "object" || parsed === null) return null
    const fields: ExtractedFields = {}
    if (typeof parsed.name === "string" && parsed.name) fields.name = parsed.name
    if (typeof parsed.goals === "string" && parsed.goals) fields.goals = parsed.goals
    if (typeof parsed.productDescription === "string" && parsed.productDescription)
      fields.productDescription = parsed.productDescription
    if (typeof parsed.targetAudience === "string" && parsed.targetAudience)
      fields.targetAudience = parsed.targetAudience
    return Object.keys(fields).length > 0 ? fields : null
  } catch {
    return null
  }
}

/** Strip the ```json ... ``` block from display text so user sees only prose */
function stripJsonBlock(text: string): string {
  return text.replace(/```json\s*\n?[\s\S]*?```/, "").trim()
}

// Custom transport to point useChat at the onboarding endpoint
const onboardingTransport = new DefaultChatTransport({
  api: "/api/onboarding-chat",
})

// --- Component ---

export default function OnboardingPage() {
  const { user: auth0User } = useAuth0()
  const router = useRouter()
  const convexUser = useQuery(api.users.me)
  const completeOnboarding = useMutation(api.users.completeOnboarding)

  const [step, setStep] = useState<Step>("ask")
  const [gmailConnected, setGmailConnected] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [formData, setFormData] = useState<OnboardingValues | null>(null)
  const [extractedFields, setExtractedFields] = useState<ExtractedFields | null>(null)

  // --- Vercel AI SDK useChat for onboarding ---
  const {
    messages,
    sendMessage,
    stop,
    status,
    error: chatError,
  } = useChat({
    transport: onboardingTransport,
    onFinish: ({ message }) => {
      // Check if the assistant's response contains extracted fields
      if (message.role === "assistant") {
        const text = getTextFromParts(message)
        const fields = extractJsonFields(text)
        if (fields) {
          setExtractedFields((prev) => ({ ...prev, ...fields }))
        }
      }
    },
  })

  const isStreaming = status === "streaming" || status === "submitted"

  // --- Chat input state ---
  const [chatInput, setChatInput] = useState("")

  // --- Form (Step 2) ---
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
  const isOnboarded = convexUser?.onboardingComplete === true

  useEffect(() => {
    if (isOnboarded) {
      router.replace("/research")
    }
  }, [isOnboarded, router])

  // --- Chat helpers ---

  // Auto-resize textarea
  const chatInputRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      if (el) {
        el.style.height = "auto"
        el.style.height = Math.min(el.scrollHeight, 120) + "px"
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatInput]
  )

  // Auto-scroll
  const messagesEndRef = useCallback((el: HTMLDivElement | null) => {
    el?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const handleSendChat = useCallback(() => {
    const text = chatInput.trim()
    if (!text || isStreaming) return
    setChatInput("")
    sendMessage({ text })
  }, [chatInput, isStreaming, sendMessage])

  const handleChatKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSendChat()
      }
    },
    [handleSendChat]
  )

  function proceedToForm() {
    // Pre-fill form from extracted fields
    if (extractedFields?.name) setValue("name", extractedFields.name)
    if (extractedFields?.goals) setValue("goals", extractedFields.goals)
    if (extractedFields?.productDescription)
      setValue("productDescription", extractedFields.productDescription)
    if (extractedFields?.targetAudience)
      setValue("targetAudience", extractedFields.targetAudience)
    setStep("form")
  }

  function skipToForm() {
    setStep("form")
  }

  async function onFormSubmit(data: OnboardingValues) {
    setFormData(data)
    setStep("connect")
  }

  async function finishSetup() {
    if (!formData) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const onboardingResult = await completeOnboarding({
        name: formData.name,
        goals: formData.goals,
        productDescription: formData.productDescription,
        targetAudience: formData.targetAudience || undefined,
        gmailConnected,
      })

      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: onboardingResult.userId,
          runId: onboardingResult.runId,
          productDescription: formData.productDescription,
          targetAudience: formData.targetAudience ?? "",
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to start research agents")
      }

      router.replace("/research")
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong"
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (isOnboarded) {
    return null
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

        {/* ============================================ */}
        {/* Step 1: Ask — Conversational Chat            */}
        {/* ============================================ */}
        {step === "ask" && (
          <Card className="flex flex-col overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle>What brings you here?</CardTitle>
              <CardDescription>
                Tell us about your product and goals. Our assistant will help
                set things up for you.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-3 p-0">
              {/* Messages area */}
              <div className="flex max-h-80 min-h-48 flex-col gap-3 overflow-y-auto px-6 py-2">
                {messages.length === 0 && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <RiRobot2Line className="h-5 w-5 text-primary" />
                    </div>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Describe your product, target audience, and what you want
                      to accomplish — or just say hi and we&apos;ll guide you
                      through it.
                    </p>
                  </div>
                )}

                {messages.map((msg) => {
                  const textContent = getTextFromParts(msg)
                  const displayContent =
                    msg.role === "assistant"
                      ? stripJsonBlock(textContent)
                      : textContent

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-2.5",
                        msg.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <RiRobot2Line className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {displayContent || (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
                          </span>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10">
                          <RiUser3Line className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Error */}
              {chatError && (
                <div className="px-6">
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs">
                      {chatError.message}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Extracted-fields confirmation */}
              {extractedFields && !isStreaming && (
                <div className="mx-6 rounded-md border border-primary/20 bg-primary/5 p-3">
                  <p className="mb-2 text-xs font-medium text-primary">
                    We captured the following from our conversation:
                  </p>
                  <ul className="mb-3 space-y-1 text-xs text-muted-foreground">
                    {extractedFields.name && (
                      <li>
                        <span className="font-medium text-foreground">Name:</span>{" "}
                        {extractedFields.name}
                      </li>
                    )}
                    {extractedFields.goals && (
                      <li>
                        <span className="font-medium text-foreground">Goals:</span>{" "}
                        {extractedFields.goals}
                      </li>
                    )}
                    {extractedFields.productDescription && (
                      <li>
                        <span className="font-medium text-foreground">
                          Product:
                        </span>{" "}
                        {extractedFields.productDescription}
                      </li>
                    )}
                    {extractedFields.targetAudience && (
                      <li>
                        <span className="font-medium text-foreground">
                          Audience:
                        </span>{" "}
                        {extractedFields.targetAudience}
                      </li>
                    )}
                  </ul>
                  <Button size="sm" onClick={proceedToForm} className="w-full">
                    Continue with these details
                    <RiArrowRightLine className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Input area */}
              <div className="border-t px-6 py-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    ref={chatInputRef}
                    placeholder="Tell us about your product and goals..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    disabled={isStreaming}
                    rows={1}
                    className="min-h-9 max-h-[120px] resize-none text-sm"
                  />
                  {isStreaming ? (
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => stop()}
                      title="Stop"
                    >
                      <RiStopCircleLine className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="icon-sm"
                      onClick={handleSendChat}
                      disabled={!chatInput.trim()}
                      title="Send"
                    >
                      <RiSendPlaneFill className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={skipToForm}
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Skip and fill in manually
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================ */}
        {/* Step 2: Form                                 */}
        {/* ============================================ */}
        {step === "form" && (
          <Card>
            <CardHeader>
              <CardTitle>Tell us about yourself</CardTitle>
              <CardDescription>
                {extractedFields
                  ? "We've pre-filled some details from your conversation. Review and edit as needed."
                  : "Fill in a few details so we can personalize your experience."}
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

        {/* ============================================ */}
        {/* Step 3: Connect apps                         */}
        {/* ============================================ */}
        {step === "connect" && (
          <Card>
            <CardHeader>
              <CardTitle>Connect your apps</CardTitle>
              <CardDescription>
                Link your accounts to power outreach and campaigns.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
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
