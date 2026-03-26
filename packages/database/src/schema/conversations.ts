import { pgTable, uuid, varchar, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { businesses } from './businesses'
import { customers } from './customers'

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),

  status: varchar('status', { length: 20 }).default('active').notNull(), // active | closed | handed_off
  handedOffTo: varchar('handed_off_to', { length: 255 }), // agent name/phone
  handedOffAt: timestamp('handed_off_at', { withTimezone: true }),
  handoffReason: text('handoff_reason'),

  // AI context
  summary: text('summary'), // AI-generated conversation summary
  sentiment: varchar('sentiment', { length: 20 }), // positive | neutral | negative
  lastAiContext: text('last_ai_context'), // cached context for continuity

  // Stats
  messageCount: integer('message_count').default(0).notNull(),
  aiMessagesCount: integer('ai_messages_count').default(0).notNull(),
  humanMessagesCount: integer('human_messages_count').default(0).notNull(),

  // Rating
  customerRating: integer('customer_rating'), // 1-5
  resolvedByAi: boolean('resolved_by_ai').default(false).notNull(),

  startedAt: timestamp('started_at', { withTimezone: true }).default(sql`now()`).notNull(),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }).default(sql`now()`).notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
