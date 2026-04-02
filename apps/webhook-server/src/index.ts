import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { whatsappRouter } from './routes/whatsapp'
import { razorpayRouter } from './routes/razorpay'
import { healthRouter } from './routes/health'

const app = new Hono()

// ─── Middleware ───────────────────────────────────────────────
app.use('*', logger())
app.use('*', secureHeaders())

// ─── Routes ───────────────────────────────────────────────────
app.route('/api', whatsappRouter)
app.route('/api', razorpayRouter)
app.route('/', healthRouter)

// ─── 404 fallback ─────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// ─── Error handler ────────────────────────────────────────────
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

// ─── Start ────────────────────────────────────────────────────
const PORT = parseInt(process.env['PORT'] ?? '3001')

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`🚀 Webhook server running on http://localhost:${PORT}`)
  console.log(`📡 WhatsApp webhook: http://localhost:${PORT}/api/webhook/whatsapp`)
})

export default app
