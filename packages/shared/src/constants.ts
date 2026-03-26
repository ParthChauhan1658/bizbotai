// ─── Plans ────────────────────────────────────────────────────
export const PLANS = {
  TRIAL: 'trial',
  STARTER: 'starter',
  PRO: 'pro',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise',
} as const

export const PLAN_LIMITS = {
  trial: { messages: 200, kbDocs: 1, broadcasts: false },
  starter: { messages: 2000, kbDocs: 10, broadcasts: false },
  pro: { messages: 5000, kbDocs: 50, broadcasts: true },
  business: { messages: 15000, kbDocs: 200, broadcasts: true },
  enterprise: { messages: Infinity, kbDocs: Infinity, broadcasts: true },
} as const

export const PLAN_PRICES_INR = {
  trial: 0,
  starter: 1499,
  pro: 2999,
  business: 4999,
  enterprise: 0, // custom
} as const

// ─── Business Types ───────────────────────────────────────────
export const BUSINESS_TYPES = {
  RESTAURANT: 'restaurant',
  CLINIC: 'clinic',
  SALON: 'salon',
  ECOMMERCE: 'ecommerce',
  COACHING: 'coaching',
  REAL_ESTATE: 'real_estate',
  HOTEL: 'hotel',
  OTHER: 'other',
} as const

// ─── AI Models ────────────────────────────────────────────────
export const AI_MODELS = {
  HAIKU: 'claude-haiku-4-5',
  SONNET: 'claude-sonnet-4-6',
  OPUS: 'claude-opus-4-6',
} as const

// ─── Order Status ─────────────────────────────────────────────
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const

// ─── Appointment Status ───────────────────────────────────────
export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const

// ─── Supported Languages ──────────────────────────────────────
export const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr', 'ta', 'te', 'kn', 'bn', 'gu'] as const

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  bn: 'Bengali',
  gu: 'Gujarati',
}

// ─── WhatsApp ─────────────────────────────────────────────────
export const WA_API_VERSION = 'v21.0'
export const WA_API_BASE = `https://graph.facebook.com/${WA_API_VERSION}`

// ─── Cache TTLs (seconds) ─────────────────────────────────────
export const CACHE_TTL = {
  BUSINESS_CONFIG: 300,    // 5 mins
  AI_RESPONSE: 3600,       // 1 hour
  CUSTOMER_PROFILE: 600,   // 10 mins
  CONVERSATION_CONTEXT: 1800, // 30 mins
} as const
