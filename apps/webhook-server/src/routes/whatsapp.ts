import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { db, businesses, customers, conversations, messages } from '@bizbot/database'
import { EventProducer, EVENTS } from '@bizbot/events'
import { detectLanguage } from '@bizbot/shared'
import { parseWhatsAppWebhook } from '../parsers/whatsapp'
import { verifyWhatsAppSignature } from '../middleware/signature'

const router = new Hono()
const producer = new EventProducer(process.env['REDIS_URL']!)

// ─── Webhook Verification (GET) ───────────────────────────────
router.get('/webhook/whatsapp', (c) => {
  const mode = c.req.query('hub.mode')
  const token = c.req.query('hub.verify_token')
  const challenge = c.req.query('hub.challenge')

  if (mode === 'subscribe' && token === process.env['WA_WEBHOOK_VERIFY_TOKEN']) {
    console.log('✅ WhatsApp webhook verified')
    return c.text(challenge ?? '')
  }

  return c.json({ error: 'Forbidden' }, 403)
})

// ─── Incoming Messages (POST) ─────────────────────────────────
router.post('/webhook/whatsapp', verifyWhatsAppSignature, async (c) => {
  // Always return 200 immediately — Meta requires this
  c.status(200)

  try {
    const rawBody = c.get('rawBody') as string
    const body = JSON.parse(rawBody)
    const parsedMessages = parseWhatsAppWebhook(body)

    for (const msg of parsedMessages) {
      // Handle status updates separately
      if (msg.type === 'status') {
        await handleStatusUpdate(msg.waMessageId, msg.status ?? 'unknown')
        continue
      }

      // Look up business by phone number ID
      const [business] = await db
        .select()
        .from(businesses)
        .where(
          and(
            eq(businesses.waPhoneNumberId, msg.phoneNumberId),
            eq(businesses.isActive, true)
          )
        )
        .limit(1)

      if (!business) {
        console.warn(`No active business found for phone_number_id: ${msg.phoneNumberId}`)
        continue
      }

      // Find or create customer
      const customer = await upsertCustomer(business.id, msg.from, msg.customerName)

      // Find or create active conversation
      const conversation = await upsertConversation(business.id, customer.id)

      // Save inbound message
      const messageId = randomUUID()
      await db.insert(messages).values({
        id: messageId,
        conversationId: conversation.id,
        businessId: business.id,
        customerId: customer.id,
        direction: 'inbound',
        messageType: msg.type,
        content: msg.content,
        mediaUrl: msg.mediaId ? `https://graph.facebook.com/v21.0/${msg.mediaId}` : undefined,
        mediaMimeType: msg.mediaMimeType,
        waMessageId: msg.waMessageId,
        waTimestamp: new Date(msg.timestamp),
      })

      // Update conversation stats
      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          messageCount: conversation.messageCount + 1,
        })
        .where(eq(conversations.id, conversation.id))

      // Update customer stats
      await db
        .update(customers)
        .set({
          lastMessageAt: new Date(),
          totalMessages: customer.totalMessages + 1,
          name: msg.customerName ?? customer.name ?? undefined,
        })
        .where(eq(customers.id, customer.id))

      // Detect language
      const lang = msg.content ? detectLanguage(msg.content) : (customer.language ?? 'en')

      // Emit to Redis Stream for AI processing
      await producer.messageReceived({
        businessId: business.id,
        customerId: customer.id,
        conversationId: conversation.id,
        messageId,
        waMessageId: msg.waMessageId,
        content: msg.content,
        messageType: msg.type as never,
        mediaUrl: msg.mediaId ? `https://graph.facebook.com/v21.0/${msg.mediaId}` : undefined,
        language: lang,
        timestamp: Date.now(),
      })

      console.log(`📨 Message from ${msg.from} → business ${business.name} → emitted to stream`)
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
    // Still return 200 — never let Meta retry flood us
  }

  return c.json({ status: 'ok' })
})

// ─── Helpers ──────────────────────────────────────────────────
async function upsertCustomer(businessId: string, waId: string, name?: string) {
  const [existing] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.businessId, businessId), eq(customers.waId, waId)))
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(customers)
    .values({
      businessId,
      waId,
      name: name ?? null,
      firstMessageAt: new Date(),
      lastMessageAt: new Date(),
    })
    .returning()

  return created!
}

async function upsertConversation(businessId: string, customerId: string) {
  const [active] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.businessId, businessId),
        eq(conversations.customerId, customerId),
        eq(conversations.status, 'active')
      )
    )
    .limit(1)

  if (active) return active

  const [created] = await db
    .insert(conversations)
    .values({ businessId, customerId })
    .returning()

  return created!
}

async function handleStatusUpdate(waMessageId: string, status: string) {
  await db
    .update(messages)
    .set({ waStatus: status })
    .where(eq(messages.waMessageId, waMessageId))
}

export { router as whatsappRouter }
