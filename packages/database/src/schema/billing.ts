import { pgTable, uuid, varchar, text, timestamp, date } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { businesses } from './businesses'

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),

  amount: varchar('amount', { length: 20 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending | paid | failed | refunded

  plan: varchar('plan', { length: 20 }).notNull(),
  billingPeriodStart: date('billing_period_start'),
  billingPeriodEnd: date('billing_period_end'),

  razorpayInvoiceId: varchar('razorpay_invoice_id', { length: 50 }),
  razorpayPaymentId: varchar('razorpay_payment_id', { length: 50 }),
  razorpayOrderId: varchar('razorpay_order_id', { length: 50 }),

  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export const subscriptionEvents = pgTable('subscription_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  event: varchar('event', { length: 100 }).notNull(), // subscription.activated | subscription.charged | etc.
  payload: text('payload').notNull(), // raw Razorpay webhook payload
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
