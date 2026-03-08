"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useMutation, useQuery } from "convex/react"
import { useChat } from "@ai-sdk/react"
import type { UIMessage } from "ai"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  RiSendPlaneFill,
  RiAddLine,
  RiDeleteBinLine,
  RiChat3Line,
  RiRobot2Line,
  RiUser3Line,
  RiStopCircleLine,
} from "@remixicon/react"

/** Extract plain text from a UIMessage's parts array */
function getTextFromParts(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

export default function ChatPage() {
  // Convex queries/mutations
  const threads = useQuery(api.chat.listThreads)
  const createThread = useMutation(api.chat.createThread)
  const deleteThread = useMutation(api.chat.deleteThread)
  const saveMessage = useMutation(api.chat.saveMessage)

  // Active thread
  const [activeThreadId, setActiveThreadId] = useState<Id<"chatThreads"> | null>(
    null
  )
  const persistedMessages = useQuery(
    api.chat.listMessages,
    activeThreadId ? { threadId: activeThreadId } : "skip"
  )

  // Track the active thread ID in a ref so callbacks always see the latest value
  const activeThreadIdRef = useRef(activeThreadId)
  activeThreadIdRef.current = activeThreadId

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Vercel AI SDK useChat hook
  const {
    messages,
    setMessages,
    sendMessage,
    stop,
    status,
    error,
  } = useChat({
    onFinish: async ({ message }) => {
      // Persist the assistant message to Convex once streaming is done
      const threadId = activeThreadIdRef.current
      if (threadId && message.role === "assistant") {
        const textContent = getTextFromParts(message)
        if (textContent) {
          await saveMessage({
            threadId,
            role: "assistant",
            content: textContent,
          })
        }
      }
    },
  })

  const isStreaming = status === "streaming" || status === "submitted"

  // Sync persisted messages into useChat state when switching threads
  useEffect(() => {
    if (persistedMessages && !isStreaming) {
      setMessages(
        persistedMessages.map((m) => ({
          id: m._id,
          role: m.role as "user" | "assistant",
          parts: [{ type: "text" as const, text: m.content }],
        }))
      )
    }
  }, [persistedMessages, isStreaming, setMessages])

  // Auto-resize textarea
  const [inputValue, setInputValue] = useState("")
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = Math.min(el.scrollHeight, 200) + "px"
    }
  }, [inputValue])

  // Auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleNewThread = useCallback(() => {
    setActiveThreadId(null)
    setMessages([])
    setInputValue("")
  }, [setMessages])

  const handleSelectThread = useCallback((id: Id<"chatThreads">) => {
    setActiveThreadId(id)
  }, [])

  const handleDeleteThread = useCallback(
    async (id: Id<"chatThreads">) => {
      await deleteThread({ threadId: id })
      if (activeThreadId === id) {
        handleNewThread()
      }
    },
    [deleteThread, activeThreadId, handleNewThread]
  )

  const handleSend = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || isStreaming) return

    setInputValue("")

    // Create Convex thread if this is the first message in a new conversation
    let threadId = activeThreadIdRef.current
    if (!threadId) {
      const title = text.length > 50 ? text.slice(0, 50) + "..." : text
      threadId = await createThread({ title })
      setActiveThreadId(threadId)
      activeThreadIdRef.current = threadId
    }

    // Persist user message to Convex
    await saveMessage({
      threadId,
      role: "user",
      content: text,
    })

    // Send via AI SDK (triggers streaming)
    sendMessage({ text })
  }, [inputValue, isStreaming, createThread, saveMessage, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className="flex h-[calc(100svh-3.5rem)] overflow-hidden">
      {/* Thread sidebar */}
      <div className="hidden w-64 shrink-0 flex-col border-r bg-muted/30 md:flex">
        <div className="flex items-center justify-between border-b p-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Threads
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNewThread}
            title="New thread"
          >
            <RiAddLine className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {!threads ? (
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 p-2">
              {threads.map((t) => (
                <div
                  key={t._id}
                  className={cn(
                    "group flex items-center gap-2 rounded-sm px-2.5 py-2 text-xs transition-colors cursor-pointer",
                    activeThreadId === t._id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                  onClick={() => handleSelectThread(t._id)}
                >
                  <RiChat3Line className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{t.title}</span>
                  <button
                    className="hidden shrink-0 rounded-sm p-0.5 hover:bg-destructive/20 hover:text-destructive group-hover:block"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteThread(t._id)
                    }}
                  >
                    <RiDeleteBinLine className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <RiRobot2Line className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-lg font-medium">GTM Assistant</h2>
              <p className="max-w-sm text-center text-sm text-muted-foreground">
                Ask about go-to-market strategy, ideal customer profiles,
                messaging, outreach, or anything GTM-related.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-6">
              {messages.map((msg) => {
                const textContent = getTextFromParts(msg)

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "mb-6 flex gap-3",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <RiRobot2Line className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {textContent || (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
                        </span>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10">
                        <RiUser3Line className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-auto max-w-3xl px-4">
            <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error.message}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t bg-background p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Textarea
              ref={textareaRef}
              placeholder="Ask about GTM strategy..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              rows={1}
              className="min-h-[2.5rem] max-h-[200px] resize-none"
            />
            {isStreaming ? (
              <Button
                variant="outline"
                size="icon"
                onClick={() => stop()}
                title="Stop"
              >
                <RiStopCircleLine className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim()}
                title="Send"
              >
                <RiSendPlaneFill className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-muted-foreground">
            Powered by OpenRouter. Responses may not always be accurate.
          </p>
        </div>
      </div>
    </div>
  )
}
