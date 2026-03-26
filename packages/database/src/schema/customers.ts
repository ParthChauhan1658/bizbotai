import { pgTable, uuid, varchar, text, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { businesses } from './businesses'

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),

  // WhatsApp identity
  waId: varchar('wa_id', { length: 20 }).notNull(), // WhatsApp phone number
  name: varchar('name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),

  // Profile
  language: varchar('language', { length: 10 }).default('en').notNull(),
  tags: text('tags').array().default(sql`'{}'`).notNull(),
  notes: text('notes'),
  metadata: jsonb('metadata').default(sql`'{}'`).notNull(), // flexible extra data

  // Stats
  firstMessageAt: timestamp('first_message_at', { withTimezone: true }),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  totalMessages: integer('total_messages').default(0).notNull(),
  totalOrders: integer('total_orders').default(0).notNull(),
  totalAppointments: integer('total_appointments').default(0).notNull(),
  totalSpent: varchar('total_spent', { length: 20 }).default('0').notNull(),

  // Status
  isBlocked: boolean('is_blocked').default(false).notNull(),
  optedOutOfBroadcast: boolean('opted_out_of_broadcast').default(false).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
