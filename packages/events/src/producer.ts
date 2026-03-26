import Redis from 'ioredis'
import { randomUUID } from 'crypto'
import { STREAMS, EVENTS } from './types'
import type {
  MessageReceivedEvent,
  MessageSendEvent,
  MessageStatusEvent,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  OrderPaidEvent,
  BookingCreatedEvent,
  BookingReminderEvent,
  BookingStatusChangedEvent,
  PaymentReceivedEvent,
  ConversationHandoffEvent,
  AnalyticsTrackEvent,
  BusinessCreatedEvent,
} from './types'

export class EventProducer {
  private redis: Redis

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 3 })
  }

  private async emit(stream: string, eventName: string, payload: Record<string, unknown>): Promise<string> {
    const eventId = randomUUID()
    const data = {
      eventId,
      eventName,
      payload: JSON.stringify({ ...payload, eventId }),
      timestamp: Date.now().toString(),
    }
    const id = await this.redis.xadd(stream, '*', ...Object.entries(data).flat())
    return id ?? eventId
  }

  // ─── Message events ───────────────────────────────────────────
  async messageReceived(payload: Omit<MessageReceivedEvent, 'eventId'>): Promise<string> {
    return this.emit(STREAMS.MESSAGES, EVENTS.MESSAGE_RECEIVED, payload)
  }

  async messageSend(payload: Omit<MessageSendEvent, 'eventId'>): Promise<string> {
    return this.emit(STREAMS.MESSAGES, EVENTS.MESSAGE_SEND, payload)
  }

  async messageStatus(payload: Omit<MessageStatusEvent, 'eventId'>): Promise<string> {
    return this.emit(STREAMS.MESSAGES, EVENTS.MESSAGE_STATUS, payload)
  }

  // ─── Order events ─────────────────────────────────────────────
  async orderCreated(payload: Omit<OrderCreatedEvent, 'eventId'>): Promise<string> {
    return this.emit(STREAMS.ORDERS, EVENTS.ORDER_CREATED, payload)
  }

  async orderStatusChanged(payload: Omit<OrderStatusChangedEvent, 'eventId'>): Promise<string> {
    return this.emit(STREAMS.ORDERS, EVENTS.ORDER_STATUS_CHANGED, payload)
  }

  async orderPaid(payload: Omit<OrderPaidEvent, 'eventId'>): Promise<string> {
    return this.emit(STREAMS.ORDERS, EVENTS.ORDER_PAID, payload)
  }

  // ─── Booking events ───────────────────────────────────────────
  async bookingCreated(payload: Omit<BookingCreatedEvent, 'eventId'>): Promise<string> {
    return this.emit(STREAMS.BOOKINGS, EVENTS.BOOKING_CREATED, payload)
  }

  async bookingReminder(payload: Omit<BookingReminderEvent, 'eventId'>): Promise<string> {
    return this.emit(STREAMS.BOOKINGS, EVENTS.BOOKING_REMINDER, payload)
  }

  async bookingStatusChanged(payload: Omit<BookingStatusChangedEvent, 'eventId'>): Promise<string> {
    return this.emit(STREAMS.BOOKINGS, EVENTS.BOOKING_STATUS_CHANGED, payload)
  }

  // ─── Payment events ───────────────────────────────────────────
  async paymentReceived(payload: Omit<PaymentReceivedEvent, 'eventId'>): Promise<string> {
    return this.emit(STREAMS.PAYMENTS, EVENTS.PAYMENT_RECEIVED, payload)
  }

  // ─── Conversation events ──────────────────────────────────────
  async conversationHandoff(payload: Omit<ConversationHandoffEvent, 'eventId'>): Promise<string> {
    return this.emit(STREAMS.CONVERSATIONS, EVENTS.CONVERSATION_HANDOFF, payload)
  }

  // ─── Analytics events ─────────────────────────────────────────
  async analyticsTrack(payload: Omit<AnalyticsTrackEvent, 'eventId'>): Promise<string> {
    return this.emit(STREAMS.ANALYTICS, EVENTS.ANALYTICS_TRACK, payload)
  }

  // ─── Business events ──────────────────────────────────────────
  async businessCreated(payload: Omit<BusinessCreatedEvent, 'eventId'>): Promise<string> {
    return this.emit(STREAMS.BUSINESS, EVENTS.BUSINESS_CREATED, payload)
  }

  async disconnect(): Promise<void> {
    await this.redis.quit()
  }
}
