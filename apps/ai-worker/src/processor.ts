import Anthropic from '@anthropic-ai/sdk'
import { eq } from 'drizzle-orm'
import { db, businesses, customers, conversations, messages } from '@bizbot/database'
import { EventProducer } from '@bizbot/events'
import { isWithinBusinessHours } from '@bizbot/shared'
import { buildContext } from './context-builder'
import { routeModel } from './model-router'
import { BIZBOT_TOOLS } from './tools'
import type { MessageReceivedEvent } from '@bizbot/events'

const claude = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY']! })
const producer = new EventProducer(process.env['REDIS_URL']!)

export async function processMessage(event: MessageReceivedEvent): Promise<void> {
  const start = Date.now()
  const { businessId, customerId, conversationId, messageId, content, language } = event

  try {
    // 1. Load business config
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1)

    if (!business || !business.isActive) return

    // 2. Check if conversation is handed off to human
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1)

    if (conversation?.status === 'handed_off') {
      console.log(`Conversation ${conversationId} is handed off — skipping AI`)
      return
    }

    // 3. Check business hours
    const withinHours = isWithinBusinessHours(
      business.businessHours as Record<string, { open: string; close: string; closed?: boolean }> | null
    )
    if (!withinHours) {
      const reply = business.autoReplyOutsideHours ??
        `Hi! We're currently closed. We'll get back to you during business hours.`
      await sendReply(businessId, customerId, conversationId, reply)
      return
    }

    // 4. Check message limit
    const limit = business.monthlyMessageLimit ?? 200
    if (business.messagesUsedThisMonth >= limit) {
      console.warn(`Business ${businessId} exceeded message limit`)
      await sendReply(
        businessId, customerId, conversationId,
        `Hi! Please contact us directly for assistance.`
      )
      return
    }

    // 5. Build AI context
    const ctx = await buildContext(
      businessId, customerId, conversationId,
      content ?? '', language
    )

    // 6. Route to correct model
    const model = routeModel({
      message: content ?? '',
      messageType: event.messageType,
      conversationHistory: ctx.chatHistory,
    })

    // 7. Build messages for Claude
    const systemWithKB = ctx.kbContext
      ? `${ctx.systemPrompt}\n\n${ctx.kbContext}`
      : ctx.systemPrompt

    const claudeMessages: Anthropic.MessageParam[] = [
      ...ctx.chatHistory,
      { role: 'user', content: content ?? '[non-text message]' },
    ]

    // 8. Agentic loop — call Claude, handle tool use, loop until final reply
    console.log(`Calling ${model} for business ${business.name}`)
    const { replyText, tokensUsed, toolsUsed } = await runAgentLoop({
      model,
      system: systemWithKB,
      messages: claudeMessages,
      maxTokens: parseInt(String(business.maxTokensPerReply)) || 500,
      ctx: { businessId, customerId, conversationId, business, producer },
    })

    const latencyMs = Date.now() - start

    // 9. Send text reply if present
    if (replyText) {
      await sendReply(businessId, customerId, conversationId, replyText, {
        aiGenerated: true,
        aiModel: model,
        aiTokensUsed: tokensUsed,
        aiLatencyMs: latencyMs,
      })
    }

    // 10. Update usage counter
    await db
      .update(businesses)
      .set({ messagesUsedThisMonth: business.messagesUsedThisMonth + 1 })
      .where(eq(businesses.id, businessId))

    // 11. Track analytics
    await producer.analyticsTrack({
      businessId,
      event: 'message.processed',
      properties: {
        model,
        tokensUsed,
        latencyMs,
        toolsUsed,
      },
      timestamp: Date.now(),
    })

    console.log(`Processed in ${latencyMs}ms | model=${model} | tokens=${tokensUsed}`)
  } catch (err) {
    console.error(`Error processing message ${messageId}:`, err)
    throw err
  }
}

// ─── Agentic loop ─────────────────────────────────────────────
// Handles multi-turn tool use: Claude calls a tool → we execute it →
// feed results back → Claude calls more tools or gives final reply
async function runAgentLoop(opts: {
  model: string
  system: string
  messages: Anthropic.MessageParam[]
  maxTokens: number
  ctx: {
    businessId: string
    customerId: string
    conversationId: string
    business: { id: string; name: string }
    producer: EventProducer
  }
}): Promise<{ replyText: string; tokensUsed: number; toolsUsed: string[] }> {
  const { model, system, maxTokens, ctx } = opts
  let messages = [...opts.messages]
  let totalTokens = 0
  const toolsUsed: string[] = []
  const MAX_ITERATIONS = 5 // prevent infinite loops

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await claude.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages,
      tools: BIZBOT_TOOLS,
    })

    totalTokens += response.usage.input_tokens + response.usage.output_tokens

    // Collect text and tool_use blocks
    let replyText = ''
    const toolUseBlocks: Anthropic.ToolUseBlock[] = []

    for (const block of response.content) {
      if (block.type === 'text') {
        replyText = block.text
      } else if (block.type === 'tool_use') {
        toolUseBlocks.push(block)
        toolsUsed.push(block.name)
      }
    }

    // No tool calls — Claude gave a final answer
    if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
      return { replyText, tokensUsed: totalTokens, toolsUsed }
    }

    // Execute each tool and collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const toolBlock of toolUseBlocks) {
      const result = await executeToolCall(
        toolBlock.name,
        toolBlock.input as Record<string, unknown>,
        ctx
      )
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: JSON.stringify(result),
      })
    }

    // Append Claude's response + tool results to message history, then loop
    messages = [
      ...messages,
      { role: 'assistant', content: response.content },
      { role: 'user', content: toolResults },
    ]
  }

  // Fallback if we hit the iteration limit
  return { replyText: '', tokensUsed: totalTokens, toolsUsed }
}

// ─── MCP server base URLs (from env or defaults for local dev) ────────────
const MCP_URLS = {
  kb:      process.env['MCP_KB_URL']      ?? 'http://localhost:4001',
  order:   process.env['MCP_ORDER_URL']   ?? 'http://localhost:4002',
  booking: process.env['MCP_BOOKING_URL'] ?? 'http://localhost:4003',
  payment: process.env['MCP_PAYMENT_URL'] ?? 'http://localhost:4004',
  crm:     process.env['MCP_CRM_URL']     ?? 'http://localhost:4005',
}

// Call an MCP microservice tool via HTTP POST
async function callMcpTool(baseUrl: string, toolName: string, input: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${baseUrl}/tools/${toolName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json() as { success?: boolean; result?: unknown; error?: string }
  if (!res.ok || data.error) {
    throw new Error(data.error ?? `MCP tool ${toolName} returned ${res.status}`)
  }
  return data.result ?? data
}

// ─── Tool execution ───────────────────────────────────────────
async function executeToolCall(
  toolName: string,
  input: Record<string, unknown>,
  ctx: {
    businessId: string
    customerId: string
    conversationId: string
    business: { id: string; name: string }
    producer: EventProducer
  }
): Promise<unknown> {
  console.log(`Tool call: ${toolName}`, input)

  // Inject server-side context that Claude doesn't know about
  const ctxInput = {
    ...input,
    businessId: ctx.businessId,
    customerId: ctx.customerId,
    conversationId: ctx.conversationId,
  }

  try {
    switch (toolName) {
      // ── Knowledge Base ──────────────────────────────────────
      case 'search_knowledge_base':
        return callMcpTool(MCP_URLS.kb, 'search_knowledge_base', ctxInput)

      // ── Menu / Orders ───────────────────────────────────────
      case 'list_menu':
        return callMcpTool(MCP_URLS.order, 'list_menu', ctxInput)

      case 'create_order':
        return callMcpTool(MCP_URLS.order, 'create_order', ctxInput)

      case 'get_order':
        return callMcpTool(MCP_URLS.order, 'get_order', ctxInput)

      // ── Booking ─────────────────────────────────────────────
      case 'list_services':
        return callMcpTool(MCP_URLS.booking, 'list_services', ctxInput)

      case 'check_availability':
        return callMcpTool(MCP_URLS.booking, 'check_availability', ctxInput)

      case 'create_appointment':
        return callMcpTool(MCP_URLS.booking, 'create_appointment', ctxInput)

      // ── Payments ────────────────────────────────────────────
      case 'create_payment_link':
        return callMcpTool(MCP_URLS.payment, 'create_payment_link', ctxInput)

      case 'check_payment_status':
        return callMcpTool(MCP_URLS.payment, 'check_payment_status', ctxInput)

      // ── Escalation (handled inline — needs DB + event bus) ──
      case 'escalate_to_human': {
        await db
          .update(conversations)
          .set({
            status: 'handed_off',
            handoffReason: input['reason'] as string,
            handedOffAt: new Date(),
          })
          .where(eq(conversations.id, ctx.conversationId))

        await ctx.producer.conversationHandoff({
          businessId: ctx.businessId,
          customerId: ctx.customerId,
          conversationId: ctx.conversationId,
          reason: input['reason'] as string,
          timestamp: Date.now(),
        })

        return { success: true, message: 'Conversation handed off to a human agent. They will respond shortly.' }
      }

      default:
        return { success: false, message: `Unknown tool: ${toolName}` }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Tool ${toolName} failed:`, message)
    return { success: false, error: message }
  }
}

// ─── Send reply helper ────────────────────────────────────────
async function sendReply(
  businessId: string,
  customerId: string,
  conversationId: string,
  content: string,
  meta?: {
    aiGenerated?: boolean
    aiModel?: string
    aiTokensUsed?: number
    aiLatencyMs?: number
  }
) {
  await db.insert(messages).values({
    conversationId,
    businessId,
    customerId,
    direction: 'outbound',
    messageType: 'text',
    content,
    aiGenerated: meta?.aiGenerated ?? false,
    aiModel: meta?.aiModel,
    aiTokensUsed: meta?.aiTokensUsed ?? 0,
    aiLatencyMs: meta?.aiLatencyMs,
  })

  const [customer] = await db
    .select({ waId: customers.waId })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1)

  if (!customer) return

  await producer.messageSend({
    businessId,
    customerId,
    conversationId,
    waId: customer.waId,
    content,
    messageType: 'text',
    timestamp: Date.now(),
  })
}
