import { BackboardClient } from "backboard-sdk"
import { NextRequest } from "next/server"

const SYSTEM_PROMPT = `You are a friendly onboarding assistant for HundredUsers, a go-to-market (GTM) platform.

Your job is to have a brief, focused conversation (2–4 exchanges) to understand what the user is building and what they want to achieve. You need to gather:
1. Their name or company name
2. Their goals (what they want to accomplish with GTM)
3. A description of their product or service
4. Their target audience (optional but helpful)

Be conversational, warm, and concise. Ask one or two questions at a time, not all at once. Build on what the user tells you.

IMPORTANT: When you feel you have enough information (at least name, goals, and product description), end your message with a JSON block wrapped in \`\`\`json ... \`\`\` fences containing the extracted fields. Use exactly this schema:
\`\`\`json
{
  "name": "...",
  "goals": "...",
  "productDescription": "...",
  "targetAudience": "..."
}
\`\`\`

Only include the JSON block when you have gathered sufficient information. Before that, just chat naturally to gather the details. If the user provides everything in their first message, you can respond with the JSON block right away along with a brief confirmation.

Do NOT ask the user to fill out a form — you ARE the form. Extract the information from the conversation naturally.`

function getClient() {
  const apiKey = process.env.BACKBOARD_API_KEY
  if (!apiKey) {
    throw new Error("BACKBOARD_API_KEY environment variable is not set")
  }
  return new BackboardClient({ apiKey })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, assistantId, threadId } = body as {
      message: string
      assistantId?: string
      threadId?: string
    }

    if (!message?.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 })
    }

    const client = getClient()

    // Create assistant if none provided
    let currentAssistantId = assistantId
    if (!currentAssistantId) {
      const assistant = await client.createAssistant({
        name: "HundredUsers Onboarding Assistant",
        system_prompt: SYSTEM_PROMPT,
      })
      currentAssistantId = assistant.assistantId
    }

    // Create thread if none provided
    let currentThreadId = threadId
    if (!currentThreadId) {
      const thread = await client.createThread(currentAssistantId!)
      currentThreadId = thread.threadId
    }

    // Send message with streaming
    const stream = (await client.addMessage(currentThreadId!, {
      content: message,
      stream: true,
      memory: "Auto",
    })) as AsyncGenerator<Record<string, unknown>>

    // Create a ReadableStream that forwards SSE events to the client
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata first
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "metadata",
                assistantId: currentAssistantId,
                threadId: currentThreadId,
              })}\n\n`
            )
          )

          for await (const chunk of stream) {
            // Skip any chunk that carries a "role" field.
            // Backboard emits incremental content-delta chunks
            // (no role, just { content: "..." }) during streaming,
            // then a final summary chunk with role="user" (echo)
            // or role="assistant" (full message). Both would
            // duplicate content on the client, so drop them.
            if (chunk && typeof chunk === "object" && "role" in chunk) {
              continue
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
            )
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          )
          controller.close()
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Streaming error"
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error"
    console.error("Onboarding chat API error:", err)
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
