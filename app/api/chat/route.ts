import { BackboardClient } from "backboard-sdk"
import { NextRequest } from "next/server"

const SYSTEM_PROMPT = `You are a helpful GTM (Go-To-Market) assistant for HundredUsers. 
You help users with their go-to-market strategy, including:
- Defining their ideal customer profile (ICP)
- Crafting messaging and positioning
- Planning outreach campaigns
- Researching target markets and leads
- Providing actionable GTM advice

Be concise, practical, and action-oriented. When relevant, ask clarifying questions to better understand the user's product, target audience, and goals.`

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
        name: "HundredUsers GTM Assistant",
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
          // Send metadata first (assistantId, threadId) so the client can persist them
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
    console.error("Chat API error:", err)
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
