import { EventConsumer, STREAMS, EVENTS, MessageSendEvent, ConversationHandoffEvent, BookingCreatedEvent, BookingReminderEvent, OrderCreatedEvent } from '@bizbot/events'
import { eq } from 'drizzle-orm'
import { db, customers, businesses } from '@bizbot/database'
import { processNotification } from './processor.js'
import { sendEscalationAlert } from './email-sender.js'
import { scheduleReminders, startReminderWorker } from './scheduler.js'
import { sendTextMessage } from './whatsapp-sender.js'

const REDIS_URL = process.env['REDIS_URL']!

const messageConsumer      = new EventConsumer(REDIS_URL)
const conversationConsumer = new EventConsumer(REDIS_URL)
const bookingConsumer      = new EventConsumer(REDIS_URL)
const orderConsumer        = new EventConsumer(REDIS_URL)

const WORKER_ID = process.pid
let isShuttingDown = false

// ─── Stream: bizbot:messages (message.send) ───────────────────
async function runMessageStream(): Promise<void> {
  const group    = 'notification-senders'
  const consumer = `notif-msg-${WORKER_ID}`
  const stream   = STREAMS.MESSAGES

  await messageConsumer.createGroup(stream, group)
  console.log(`[messages] Consumer group "${group}" ready`)

  while (!isShuttingDown) {
    try {
      const msgs = await messageConsumer.readMessages({ stream, group, consumer, count: 10, blockMs: 2000 })
      for (const msg of msgs) {
        if (msg.eventName !== EVENTS.MESSAGE_SEND) {
          await messageConsumer.ack(stream, group, msg.id)
          continue
        }
        try {
          const event = MessageSendEvent.parse(msg.payload)
          await processNotification(event)
          await messageConsumer.ack(stream, group, msg.id)
        } catch (err) {
          console.error(`[messages] Failed ${msg.id}:`, err)
        }
      }
    } catch (err) {
      if (!isShuttingDown) { console.error('[messages] Loop error:', err); await sleep(1000) }
    }
  }
}

// ─── Stream: bizbot:conversations (conversation.handoff) ──────
async function runConversationStream(): Promise<void> {
  const group    = 'notification-handoff'
  const consumer = `notif-conv-${WORKER_ID}`
  const stream   = STREAMS.CONVERSATIONS

  await conversationConsumer.createGroup(stream, group)
  console.log(`[conversations] Consumer group "${group}" ready`)

  while (!isShuttingDown) {
    try {
      const msgs = await conversationConsumer.readMessages({ stream, group, consumer, count: 5, blockMs: 2000 })
      for (const msg of msgs) {
        if (msg.eventName !== EVENTS.CONVERSATION_HANDOFF) {
          await conversationConsumer.ack(stream, group, msg.id)
          continue
        }
        try {
          const event = ConversationHandoffEvent.parse(msg.payload)
          await handleHandoff(event)
          await conversationConsumer.ack(stream, group, msg.id)
        } catch (err) {
          console.error(`[conversations] Failed ${msg.id}:`, err)
        }
      }
    } catch (err) {
      if (!isShuttingDown) { console.error('[conversations] Loop error:', err); await sleep(1000) }
    }
  }
}

// ─── Stream: bizbot:bookings (booking.created, booking.reminder) ─
async function runBookingStream(): Promise<void> {
  const group    = 'notification-bookings'
  const consumer = `notif-book-${WORKER_ID}`
  const stream   = STREAMS.BOOKINGS

  await bookingConsumer.createGroup(stream, group)
  console.log(`[bookings] Consumer group "${group}" ready`)

  while (!isShuttingDown) {
    try {
      const msgs = await bookingConsumer.readMessages({ stream, group, consumer, count: 5, blockMs: 2000 })
      for (const msg of msgs) {
        try {
          if (msg.eventName === EVENTS.BOOKING_CREATED) {
            const event = BookingCreatedEvent.parse(msg.payload)
            await handleBookingCreated(event)
          } else if (msg.eventName === EVENTS.BOOKING_REMINDER) {
            const event = BookingReminderEvent.parse(msg.payload)
            await handleBookingReminder(event)
          }
          await bookingConsumer.ack(stream, group, msg.id)
        } catch (err) {
          console.error(`[bookings] Failed ${msg.id}:`, err)
        }
      }
    } catch (err) {
      if (!isShuttingDown) { console.error('[bookings] Loop error:', err); await sleep(1000) }
    }
  }
}

// ─── Stream: bizbot:orders (order.created) ───────────────────
async function runOrderStream(): Promise<void> {
  const group    = 'notification-orders'
  const consumer = `notif-order-${WORKER_ID}`
  const stream   = STREAMS.ORDERS

  await orderConsumer.createGroup(stream, group)
  console.log(`[orders] Consumer group "${group}" ready`)

  while (!isShuttingDown) {
    try {
      const msgs = await orderConsumer.readMessages({ stream, group, consumer, count: 5, blockMs: 2000 })
      for (const msg of msgs) {
        try {
          if (msg.eventName === EVENTS.ORDER_CREATED) {
            const event = OrderCreatedEvent.parse(msg.payload)
            await handleOrderCreated(event)
          }
          await orderConsumer.ack(stream, group, msg.id)
        } catch (err) {
          console.error(`[orders] Failed ${msg.id}:`, err)
        }
      }
    } catch (err) {
      if (!isShuttingDown) { console.error('[orders] Loop error:', err); await sleep(1000) }
    }
  }
}

// ─── Event handlers ───────────────────────────────────────────

async function handleHandoff(event: ConversationHandoffEvent): Promise<void> {
  const { businessId, customerId, conversationId, reason } = event

  const [[business], [customer]] = await Promise.all([
    db.select({ name: businesses.name, ownerEmail: businesses.ownerEmail })
      .from(businesses).where(eq(businesses.id, businessId)).limit(1),
    db.select({ name: customers.name, phone: customers.phone })
      .from(customers).where(eq(customers.id, customerId)).limit(1),
  ])

  if (!business?.ownerEmail) {
    console.warn(`Handoff: no owner email for business ${businessId}`)
    return
  }

  await sendEscalationAlert({
    toEmail: business.ownerEmail,
    businessName: business.name,
    customerName: customer?.name ?? 'Unknown',
    customerPhone: customer?.phone ?? 'Unknown',
    reason,
    conversationId,
  })

  console.log(`Sent escalation alert to ${business.ownerEmail} for conversation ${conversationId}`)
}

async function handleBookingCreated(event: BookingCreatedEvent): Promise<void> {
  const { appointmentId, businessId, customerId, serviceName, appointmentDate, startTime, endTime, amount, paymentLinkUrl } = event

  // Schedule BullMQ reminders
  await scheduleReminders({ appointmentId, businessId, customerId, serviceName, appointmentDate, startTime })

  // Send confirmation to customer on WhatsApp
  const [[business], [customer]] = await Promise.all([
    db.select({ waPhoneNumberId: businesses.waPhoneNumberId, waAccessToken: businesses.waAccessToken, name: businesses.name })
      .from(businesses).where(eq(businesses.id, businessId)).limit(1),
    db.select({ waId: customers.waId, name: customers.name })
      .from(customers).where(eq(customers.id, customerId)).limit(1),
  ])

  if (!business?.waPhoneNumberId || !business?.waAccessToken || !customer) return

  let msg = `✅ Appointment confirmed!\n\n*${serviceName}*\n📅 ${appointmentDate} at ${startTime}–${endTime}`
  if (amount) msg += `\n💰 ₹${amount}`
  if (paymentLinkUrl) msg += `\n\nPay here: ${paymentLinkUrl}`
  msg += `\n\nYou'll get reminders 24h and 1h before. See you at ${business.name}!`

  await sendTextMessage({
    phoneNumberId: business.waPhoneNumberId,
    accessToken: business.waAccessToken,
    to: customer.waId,
    message: msg,
  })
}

async function handleBookingReminder(event: BookingReminderEvent): Promise<void> {
  const { businessId, customerId, reminderType, serviceName, appointmentDate, startTime } = event

  const [[business], [customer]] = await Promise.all([
    db.select({ waPhoneNumberId: businesses.waPhoneNumberId, waAccessToken: businesses.waAccessToken })
      .from(businesses).where(eq(businesses.id, businessId)).limit(1),
    db.select({ waId: customers.waId, name: customers.name })
      .from(customers).where(eq(customers.id, customerId)).limit(1),
  ])

  if (!business?.waPhoneNumberId || !business?.waAccessToken || !customer) return

  const timeLabel = reminderType === '24h' ? 'tomorrow' : 'in 1 hour'
  const name = customer.name ?? 'there'
  const message = `Hi ${name}! 📅 Reminder: Your *${serviceName}* appointment is ${timeLabel} on ${appointmentDate} at ${startTime}. Reply CANCEL to cancel.`

  await sendTextMessage({
    phoneNumberId: business.waPhoneNumberId,
    accessToken: business.waAccessToken,
    to: customer.waId,
    message,
  })
}

async function handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
  const { businessId, customerId, orderNumber, items, total, paymentLinkUrl } = event

  const [[business], [customer]] = await Promise.all([
    db.select({ waPhoneNumberId: businesses.waPhoneNumberId, waAccessToken: businesses.waAccessToken, name: businesses.name })
      .from(businesses).where(eq(businesses.id, businessId)).limit(1),
    db.select({ waId: customers.waId, name: customers.name })
      .from(customers).where(eq(customers.id, customerId)).limit(1),
  ])

  if (!business?.waPhoneNumberId || !business?.waAccessToken || !customer) return

  const itemsList = items.map(i => `• ${i.name} x${i.qty} — ₹${i.price}`).join('\n')
  let msg = `🛍️ Order confirmed! #${orderNumber}\n\n${itemsList}\n\n*Total: ₹${total}*`
  if (paymentLinkUrl) msg += `\n\nPay here: ${paymentLinkUrl}`
  msg += `\n\nThank you for ordering from ${business.name}!`

  await sendTextMessage({
    phoneNumberId: business.waPhoneNumberId,
    accessToken: business.waAccessToken,
    to: customer.waId,
    message: msg,
  })
}

// ─── Helpers ──────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function shutdown(signal: string): Promise<void> {
  console.log(`\nReceived ${signal} — shutting down...`)
  isShuttingDown = true
  await Promise.all([
    messageConsumer.disconnect(),
    conversationConsumer.disconnect(),
    bookingConsumer.disconnect(),
    orderConsumer.disconnect(),
  ])
  console.log('Notification Worker stopped.')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// ─── Start ────────────────────────────────────────────────────
console.log(`Notification Worker starting — pid: ${WORKER_ID}`)
startReminderWorker()
console.log('BullMQ reminder worker started')

Promise.all([
  runMessageStream(),
  runConversationStream(),
  runBookingStream(),
  runOrderStream(),
]).catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
