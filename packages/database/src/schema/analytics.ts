import { pgTable, uuid, varchar, integer, timestamp, date, unique } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { businesses } from './businesses'

export const dailyAnalytics = pgTable(
  'daily_analytics',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),

    // Messages
    messagesReceived: integer('messages_received').default(0).notNull(),
    messagesSent: integer('messages_sent').default(0).notNull(),

    // Customers
    uniqueCustomers: integer('unique_customers').default(0).notNull(),
    newCustomers: integer('new_customers').default(0).notNull(),

    // Orders
    ordersPlaced: integer('orders_placed').default(0).notNull(),
    ordersRevenue: varchar('orders_revenue', { length: 20 }).default('0').notNull(),

    // Appointments
    appointmentsBooked: integer('appointments_booked').default(0).notNull(),
    appointmentsRevenue: varchar('appointments_revenue', { length: 20 }).default('0').notNull(),

    // Payments
    paymentsCollected: integer('payments_collected').default(0).notNull(),
    paymentsRevenue: varchar('payments_revenue', { length: 20 }).default('0').notNull(),

    // AI performance
    avgResponseTimeMs: integer('avg_response_time_ms').default(0).notNull(),
    aiTokensUsed: integer('ai_tokens_used').default(0).notNull(),
    aiCostUsd: varchar('ai_cost_usd', { length: 20 }).default('0').notNull(),

    // Handoffs
    handoffs: integer('handoffs').default(0).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
  },
  (table) => [unique('daily_analytics_business_date_unique').on(table.businessId, table.date)]
)

export type DailyAnalytics = typeof dailyAnalytics.$inferSelect
export type NewDailyAnalytics = typeof dailyAnalytics.$inferInsert
