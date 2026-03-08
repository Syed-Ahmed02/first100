import { streamText, convertToModelMessages } from "ai"
import { getModel } from "@/lib/ai"

const SYSTEM_PROMPT = `You are a helpful GTM (Go-To-Market) assistant for HundredUsers. 
You help users with their go-to-market strategy, including:
- Defining their ideal customer profile (ICP)
- Crafting messaging and positioning
- Planning outreach campaigns
- Researching target markets and leads
- Providing actionable GTM advice

Be concise, practical, and action-oriented. When relevant, ask clarifying questions to better understand the user's product, target audience, and goals.`

export async function POST(req: Request) {
  const { messages } = await req.json()

  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
  })

  return result.toUIMessageStreamResponse()
}
