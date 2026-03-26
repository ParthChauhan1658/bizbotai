import { z } from 'zod'

// ─── Message Events ───────────────────────────────────────────
export const MessageReceivedEvent = z.object({
  eventId: z.string(),
  businessId: z.string().uuid(),
  customerId: z.string().uuid(),
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  waMessageId: z.string().optional(),
  content: z.string().optional(),
  messageType: z.enum(['text', 'image', 'audio', 'video', 'document', 'location', 'interactive', 'button']),
  mediaUrl: z.string().optional(),
  language: z.string().default('en'),
  timestamp: z.number(),
})

export const MessageSendEvent = z.object({
  eventId: z.string(),
  businessId: z.string().uuid(),
  customerId: z.string().uuid(),
  conversationId: z.string().uuid(),
  waId: z.string(), // customer WhatsApp phone number
  content: z.string(),
  messageType: z.enum(['text', 'template', 'interactive']).default('text'),
  buttons: z.array(z.object({ id: z.string(), title: z.string() })).optional(),
  timestamp: z.number(),
})

export const MessageStatusEvent = z.object({
  eventId: z.string(),
  businessId: z.string().uuid(),
  waMessageId: z.string(),
  status: z.enum(['sent', 'delivered', 'read', 'failed']),
  error: z.string().optional(),
  timestamp: z.number(),
})

// ─── Order Events ─────────────────────────────────────────────
export const OrderCreatedEvent = z.object({
  eventId: z.string(),
  businessId: z.string().uuid(),
  customerId: z.string().uuid(),
  conversationId: z.string().uuid(),
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  items: z.array(z.object({
    name: z.string(),
    qty: z.number(),
    price: z.string(),
  })),
  total: z.string(),
  paymentLinkUrl: z.string().optional(),
  timestamp: z.number(),
})

export const OrderStatusChangedEvent = z.object({
  eventId: z.string(),
  businessId: z.string().uuid(),
  customerId: z.string().uuid(),
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  previousStatus: z.string(),
  newStatus: z.string(),
  timestamp: z.number(),
})

export const OrderPaidEvent = z.object({
  eventId: z.string(),
  businessId: z.string().uuid(),
  customerId: z.string().uuid(),
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  razorpayPaymentId: z.string(),
  amount: z.string(),
  timestamp: z.number(),
})

// ─── Booking Events ───────────────────────────────────────────
export const BookingCreatedEvent = z.object({
  eventId: z.string(),
  businessId: z.string().uuid(),
  customerId: z.string().uuid(),
  conversationId: z.string().uuid(),
  appointmentId: z.string().uuid(),
  serviceName: z.string(),
  appointmentDate: z.string(), // YYYY-MM-DD
  startTime: z.string(), // HH:mm
  endTime: z.string(),
  amount: z.string().optional(),
  paymentLinkUrl: z.string().optional(),
  timestamp: z.number(),
})

export const BookingReminderEvent = z.object({
  eventId: z.string(),
  businessId: z.string().uuid(),
  customerId: z.string().uuid(),
  appointmentId: z.string().uuid(),
  reminderType: z.enum(['24h', '1h']),
  serviceName: z.string(),
  appointmentDate: z.string(),
  startTime: z.string(),
  timestamp: z.number(),
})

export const BookingStatusChangedEvent = z.object({
  eventId: z.string(),
  businessId: z.string().uuid(),
  customerId: z.string().uuid(),
  appointmentId: z.string().uuid(),
  previousStatus: z.string(),
  newStatus: z.string(),
  timestamp: z.number(),
})

// ─── Payment Events ───────────────────────────────────────────
export const PaymentReceivedEvent = z.object({
  eventId: z.string(),
  businessId: z.string().uuid(),
  razorpayPaymentId: z.string(),
  razorpayPaymentLinkId: z.string(),
  amount: z.string(),
  currency: z.string().default('INR'),
  entityType: z.enum(['order', 'appointment', 'subscription']),
  entityId: z.string().uuid().optional(),
  timestamp: z.number(),
})

// ─── Conversation Events ──────────────────────────────────────
export const ConversationHandoffEvent = z.object({
  eventId: z.string(),
  businessId: z.string().uuid(),
  customerId: z.string().uuid(),
  conversationId: z.string().uuid(),
  reason: z.string(),
  timestamp: z.number(),
})

// ─── Analytics Events ─────────────────────────────────────────
export const AnalyticsTrackEvent = z.object({
  eventId: z.string(),
  businessId: z.string().uuid(),
  event: z.string(),
  properties: z.record(z.unknown()).optional(),
  timestamp: z.number(),
})

// ─── Business Events ──────────────────────────────────────────
export const BusinessCreatedEvent = z.object({
  eventId: z.string(),
  businessId: z.string().uuid(),
  plan: z.string(),
  businessType: z.string(),
  timestamp: z.number(),
})

// ─── TypeScript types ─────────────────────────────────────────
export type MessageReceivedEvent = z.infer<typeof MessageReceivedEvent>
export type MessageSendEvent = z.infer<typeof MessageSendEvent>
export type MessageStatusEvent = z.infer<typeof MessageStatusEvent>
export type OrderCreatedEvent = z.infer<typeof OrderCreatedEvent>
export type OrderStatusChangedEvent = z.infer<typeof OrderStatusChangedEvent>
export type OrderPaidEvent = z.infer<typeof OrderPaidEvent>
export type BookingCreatedEvent = z.infer<typeof BookingCreatedEvent>
export type BookingReminderEvent = z.infer<typeof BookingReminderEvent>
export type BookingStatusChangedEvent = z.infer<typeof BookingStatusChangedEvent>
export type PaymentReceivedEvent = z.infer<typeof PaymentReceivedEvent>
export type ConversationHandoffEvent = z.infer<typeof ConversationHandoffEvent>
export type AnalyticsTrackEvent = z.infer<typeof AnalyticsTrackEvent>
export type BusinessCreatedEvent = z.infer<typeof BusinessCreatedEvent>

// ─── Stream names ─────────────────────────────────────────────
export const STREAMS = {
  MESSAGES: 'bizbot:messages',
  ORDERS: 'bizbot:orders',
  BOOKINGS: 'bizbot:bookings',
  PAYMENTS: 'bizbot:payments',
  CONVERSATIONS: 'bizbot:conversations',
  ANALYTICS: 'bizbot:analytics',
  BUSINESS: 'bizbot:business',
} as const

// ─── Event names ──────────────────────────────────────────────
export const EVENTS = {
  MESSAGE_RECEIVED: 'message.received',
  MESSAGE_SEND: 'message.send',
  MESSAGE_STATUS: 'message.status',
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  ORDER_PAID: 'order.paid',
  BOOKING_CREATED: 'booking.created',
  BOOKING_REMINDER: 'booking.reminder',
  BOOKING_STATUS_CHANGED: 'booking.status_changed',
  PAYMENT_RECEIVED: 'payment.received',
  CONVERSATION_HANDOFF: 'conversation.handoff',
  ANALYTICS_TRACK: 'analytics.track',
  BUSINESS_CREATED: 'business.created',
} as const
