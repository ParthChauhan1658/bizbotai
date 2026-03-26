import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  ownerName: varchar('owner_name', { length: 255 }).notNull(),
  ownerEmail: varchar('owner_email', { length: 255 }).notNull().unique(),
  ownerPhone: varchar('owner_phone', { length: 20 }).notNull(),
  businessType: varchar('business_type', { length: 50 }).notNull(), // restaurant | clinic | salon | ecommerce | other

  // WhatsApp config
  waPhoneNumberId: varchar('wa_phone_number_id', { length: 50 }),
  waBusinessAccountId: varchar('wa_business_account_id', { length: 50 }),
  waAccessToken: text('wa_access_token'), // encrypted at app level
  waWebhookVerifyToken: varchar('wa_webhook_verify_token', { length: 100 }),
  waConnected: boolean('wa_connected').default(false).notNull(),

  // AI config
  systemPrompt: text('system_prompt'),
  aiModel: varchar('ai_model', { length: 50 }).default('claude-haiku-4-5').notNull(),
  aiTemperature: varchar('ai_temperature', { length: 4 }).default('0.7').notNull(),
  maxTokensPerReply: integer('max_tokens_per_reply').default(500).notNull(),

  // Business settings
  businessHours: jsonb('business_hours'), // { mon: { open: "09:00", close: "18:00", closed: false } }
  autoReplyOutsideHours: text('auto_reply_outside_hours'),
  defaultLanguage: varchar('default_language', { length: 10 }).default('en').notNull(),
  supportedLanguages: text('supported_languages').array().default(sql`'{en,hi}'`).notNull(),

  // Address
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),

  // Subscription
  plan: varchar('plan', { length: 20 }).default('trial').notNull(), // trial | starter | pro | business | enterprise
  planExpiresAt: timestamp('plan_expires_at', { withTimezone: true }),
  razorpayCustomerId: varchar('razorpay_customer_id', { length: 50 }),
  razorpaySubscriptionId: varchar('razorpay_subscription_id', { length: 50 }),

  // Usage limits
  monthlyMessageLimit: integer('monthly_message_limit').default(200).notNull(),
  messagesUsedThisMonth: integer('messages_used_this_month').default(0).notNull(),
  usageResetAt: timestamp('usage_reset_at', { withTimezone: true }),

  // Meta
  isActive: boolean('is_active').default(true).notNull(),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export type Business = typeof businesses.$inferSelect
export type NewBusiness = typeof businesses.$inferInsert
