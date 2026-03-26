import { format, isWithinInterval, setHours, setMinutes } from 'date-fns'

// ─── ID generation ────────────────────────────────────────────
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `ORD-${timestamp}${random}`
}

// ─── Business hours check ─────────────────────────────────────
interface DayHours {
  open: string   // "09:00"
  close: string  // "18:00"
  closed?: boolean
}

type BusinessHours = Record<string, DayHours>

export function isWithinBusinessHours(hours: BusinessHours | null | undefined): boolean {
  if (!hours) return true // no hours configured = always open

  const now = new Date()
  const dayName = format(now, 'EEE').toLowerCase() // mon, tue, etc.
  const dayHours = hours[dayName]

  if (!dayHours || dayHours.closed) return false

  const [openH = 9, openM = 0] = dayHours.open.split(':').map(Number)
  const [closeH = 18, closeM = 0] = dayHours.close.split(':').map(Number)

  const openTime = setMinutes(setHours(now, openH), openM)
  const closeTime = setMinutes(setHours(now, closeH), closeM)

  return isWithinInterval(now, { start: openTime, end: closeTime })
}

// ─── Language detection (basic) ───────────────────────────────
export function detectLanguage(text: string): string {
  // Devanagari Unicode range (covers Hindi, Marathi)
  if (/[\u0900-\u097F]/.test(text)) return 'hi'
  // Tamil
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'
  // Telugu
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'
  // Bengali
  if (/[\u0980-\u09FF]/.test(text)) return 'bn'
  // Gujarati
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'
  // Kannada
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'
  return 'en'
}

// ─── Format currency ──────────────────────────────────────────
export function formatINR(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

// ─── Slugify ──────────────────────────────────────────────────
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// ─── Truncate text ────────────────────────────────────────────
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

// ─── Safe JSON parse ──────────────────────────────────────────
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

// ─── WhatsApp phone format ────────────────────────────────────
export function normalizePhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  // Add India country code if missing
  if (digits.startsWith('0')) return `91${digits.slice(1)}`
  if (digits.length === 10) return `91${digits}`
  return digits
}
