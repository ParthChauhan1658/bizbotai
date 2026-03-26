import { pgTable, uuid, varchar, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { businesses } from './businesses'
import { customers } from './customers'
import { conversations } from './conversations'

export const menuItems = pgTable('menu_items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: varchar('price', { length: 20 }).notNull(), // stored as string to avoid float issues
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  category: varchar('category', { length: 100 }),
  imageUrl: text('image_url'),
  isVegetarian: varchar('is_vegetarian', { length: 5 }).default('false'),
  isVegan: varchar('is_vegan', { length: 5 }).default('false'),
  isAvailable: varchar('is_available', { length: 5 }).default('true'),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id),
  conversationId: uuid('conversation_id').references(() => conversations.id),

  orderNumber: varchar('order_number', { length: 20 }).notNull().unique(),
  items: jsonb('items').notNull(), // [{ menuItemId, name, qty, price, notes }]
  subtotal: varchar('subtotal', { length: 20 }).notNull(),
  tax: varchar('tax', { length: 20 }).default('0').notNull(),
  deliveryFee: varchar('delivery_fee', { length: 20 }).default('0').notNull(),
  discount: varchar('discount', { length: 20 }).default('0').notNull(),
  total: varchar('total', { length: 20 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),

  // Status machine: pending -> confirmed -> preparing -> ready -> delivered | cancelled
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  paymentStatus: varchar('payment_status', { length: 20 }).default('unpaid').notNull(), // unpaid | paid | refunded | partial

  // Razorpay
  razorpayPaymentLinkId: varchar('razorpay_payment_link_id', { length: 50 }),
  razorpayPaymentLinkUrl: text('razorpay_payment_link_url'),
  razorpayPaymentId: varchar('razorpay_payment_id', { length: 50 }),

  // Delivery
  deliveryType: varchar('delivery_type', { length: 20 }).default('pickup'), // pickup | delivery
  deliveryAddress: text('delivery_address'),
  estimatedDeliveryTime: varchar('estimated_delivery_time', { length: 50 }),

  notes: text('notes'),
  cancelReason: text('cancel_reason'),

  paidAt: timestamp('paid_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export type MenuItem = typeof menuItems.$inferSelect
export type NewMenuItem = typeof menuItems.$inferInsert
export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
