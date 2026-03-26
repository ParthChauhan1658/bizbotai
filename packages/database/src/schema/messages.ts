import { pgTable, uuid, varchar, text, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { businesses } from './businesses'
import { customers } from './customers'
import { conversations } from './conversations'

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id),

  // Message content
  direction: varchar('direction', { length: 10 }).notNull(), // inbound | outbound
  messageType: varchar('message_type', { length: 20 }).notNull(), // text | image | audio | video | document | location | template | interactive
  content: text('content'),
  mediaUrl: text('media_url'),
  mediaMimeType: varchar('media_mime_type', { length: 50 }),
  mediaCaption: text('media_caption'),

  // Interactive message data
  interactiveData: jsonb('interactive_data'), // buttons, list items, etc.

  // WhatsApp metadata
  waMessageId: varchar('wa_message_id', { length: 100 }).unique(),
  waStatus: varchar('wa_status', { length: 20 }), // sent | delivered | read | failed
  waTimestamp: timestamp('wa_timestamp', { withTimezone: true }),
  waError: text('wa_error'), // error message if failed

  // AI metadata
  aiGenerated: boolean('ai_generated').default(false).notNull(),
  aiModel: varchar('ai_model', { length: 50 }),
  aiTokensUsed: integer('ai_tokens_used').default(0).notNull(),
  aiCostUsd: varchar('ai_cost_usd', { length: 20 }).default('0').notNull(),
  aiLatencyMs: integer('ai_latency_ms'),

  // Action tracking
  actionType: varchar('action_type', { length: 50 }), // payment_link | booking | order | handoff
  actionData: jsonb('action_data'),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  business: one(businesses, {
    fields: [messages.businessId],
    references: [businesses.id],
  }),
  customer: one(customers, {
    fields: [messages.customerId],
    references: [customers.id],
  }),
}))

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
