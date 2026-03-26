import { pgTable, uuid, varchar, text, boolean, integer, timestamp, time, date } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { businesses } from './businesses'
import { customers } from './customers'
import { conversations } from './conversations'

export const services = pgTable('services', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  durationMins: integer('duration_mins').notNull(),
  price: varchar('price', { length: 20 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  category: varchar('category', { length: 100 }),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id),
  conversationId: uuid('conversation_id').references(() => conversations.id),
  serviceId: uuid('service_id').references(() => services.id),

  serviceName: varchar('service_name', { length: 255 }).notNull(),
  appointmentDate: date('appointment_date').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  durationMins: integer('duration_mins').notNull(),

  // Status machine: pending -> confirmed -> completed | cancelled | no_show
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  paymentStatus: varchar('payment_status', { length: 20 }).default('unpaid').notNull(),
  amount: varchar('amount', { length: 20 }),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),

  // Razorpay
  razorpayPaymentLinkId: varchar('razorpay_payment_link_id', { length: 50 }),
  razorpayPaymentLinkUrl: text('razorpay_payment_link_url'),
  razorpayPaymentId: varchar('razorpay_payment_id', { length: 50 }),

  // Reminders
  reminder24hSent: boolean('reminder_24h_sent').default(false).notNull(),
  reminder1hSent: boolean('reminder_1h_sent').default(false).notNull(),

  staffName: varchar('staff_name', { length: 255 }),
  notes: text('notes'),
  cancelReason: text('cancel_reason'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export type Service = typeof services.$inferSelect
export type NewService = typeof services.$inferInsert
export type Appointment = typeof appointments.$inferSelect
export type NewAppointment = typeof appointments.$inferInsert
