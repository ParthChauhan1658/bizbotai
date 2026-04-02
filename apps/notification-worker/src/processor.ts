import { and, eq, isNull } from 'drizzle-orm'
import { db, businesses, customers, messages } from '@bizbot/database'
import { sendTextMessage, sendInteractiveMessage } from './whatsapp-sender'
import type { MessageSendEvent } from '@bizbot/events'

export async function processNotification(event: MessageSendEvent): Promise<void> {
  const { businessId, customerId, conversationId, waId, content, messageType, buttons } = event

  // Load business WhatsApp credentials
  const [business] = await db
    .select({
      waPhoneNumberId: businesses.waPhoneNumberId,
      waAccessToken: businesses.waAccessToken,
      name: businesses.name,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)

  if (!business?.waPhoneNumberId || !business?.waAccessToken) {
    console.error(`Business ${businessId} missing WhatsApp credentials — cannot send`)
    return
  }

  const [customer] = await db
    .select({ waId: customers.waId })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1)

  const recipientWaId = customer?.waId ?? waId
  if (!recipientWaId) {
    console.error(`Customer ${customerId} missing WhatsApp waId — cannot send`)
    return
  }

  const { waPhoneNumberId, waAccessToken } = business

  let waMessageId = ''

  try {
    if (messageType === 'interactive' && buttons && buttons.length > 0) {
      // Send interactive message with quick-reply buttons
      const result = await sendInteractiveMessage({
        phoneNumberId: waPhoneNumberId,
        accessToken: waAccessToken,
        to: recipientWaId,
        body: content,
        buttons,
      })
      waMessageId = result.messageId
    } else {
      // Plain text message
      const result = await sendTextMessage({
        phoneNumberId: waPhoneNumberId,
        accessToken: waAccessToken,
        to: recipientWaId,
        message: content,
      })
      waMessageId = result.messageId
    }

    // Update message record with WA message ID and sent status
    await db
      .update(messages)
      .set({
        waMessageId,
        waStatus: 'sent',
      })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.customerId, customerId),
          eq(messages.direction, 'outbound'),
          isNull(messages.waStatus)
        )
      )

    console.log(`Sent to ${recipientWaId} via ${business.name} | waMessageId=${waMessageId}`)
  } catch (err) {
    console.error(`Failed to send WhatsApp message to ${recipientWaId}:`, err)
    throw err // rethrow so the consumer doesn't ack — will retry
  }
}
