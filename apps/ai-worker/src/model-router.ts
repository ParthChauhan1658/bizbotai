import { AI_MODELS } from '@bizbot/shared'

interface RoutingContext {
  message: string
  messageType: string
  conversationHistory: Array<{ role: string; content: string }>
}

export function routeModel(ctx: RoutingContext): string {
  const { message, messageType, conversationHistory } = ctx
  const text = message.toLowerCase()

  // Non-text messages always need Sonnet for understanding
  if (['image', 'audio', 'video', 'document'].includes(messageType)) {
    return AI_MODELS.SONNET
  }

  // Complaints / sensitive — use Sonnet
  const complaintKeywords = [
    'complaint', 'angry', 'frustrated', 'worst', 'terrible', 'refund',
    'cancel', 'cheated', 'fraud', 'disappointed', 'horrible', 'bad experience',
    'shikayat', 'gussa', 'wapas', 'dhokha', 'bakwaas'
  ]
  if (complaintKeywords.some((kw) => text.includes(kw))) return AI_MODELS.SONNET

  // Complex multi-intent — use Sonnet
  const orderKeywords = ['order', 'book', 'schedule', 'appointment', 'buy', 'purchase', 'payment', 'pay',
    'khaana', 'order karna', 'book karna', 'appointment lena']
  const bookingKeywords = ['appointment', 'slot', 'available', 'timing', 'schedule', 'book',
    'kab available', 'time']
  const hasOrder = orderKeywords.some((kw) => text.includes(kw))
  const hasBooking = bookingKeywords.some((kw) => text.includes(kw))
  if (hasOrder && hasBooking) return AI_MODELS.SONNET // multi-intent
  if (hasOrder || hasBooking) return AI_MODELS.SONNET // needs tool use

  // Long message = complex
  if (message.length > 200) return AI_MODELS.SONNET

  // Long conversation = needs more context
  if (conversationHistory.length > 10) return AI_MODELS.SONNET

  // Simple greetings / FAQs — Haiku is perfect
  return AI_MODELS.HAIKU
}
