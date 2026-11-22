import { createHmac, timingSafeEqual } from 'crypto'
import type { Context, Next } from 'hono'

export type AppVariables = {
  rawBody: string
}

// Dependency-free logging so this module has no Redis/DB side effects.
function warn(msg: string, fields: Record<string, unknown> = {}): void {
  console.warn(JSON.stringify({ level: 'warn', service: 'webhook-server', msg, ...fields }))
}

// Meta sends `sha256=<64 hex chars>`.
const SIGNATURE_FORMAT = /^sha256=[0-9a-f]{64}$/i

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

function reject(c: Context, reason: string): Response {
  // Log only the reason and path: never the secret, signature, or payload.
  warn('webhook signature rejected', { reason, path: c.req.path })
  return c.json({ error: 'Unauthorized' }, 401)
}

/**
 * Verifies X-Hub-Signature-256 = "sha256=" + HMAC_SHA256(app secret, raw body).
 * Fails closed with 401 on any problem, before any downstream handler runs.
 */
export async function verifyWhatsAppSignature(
  c: Context<{ Variables: AppVariables }>,
  next: Next
): Promise<Response | void> {
  const appSecret = process.env['WA_APP_SECRET']
  if (!appSecret) {
    return reject(c, 'secret_not_configured')
  }

  const signature = c.req.header('x-hub-signature-256')
  if (!signature) return reject(c, 'missing_header')
  if (!SIGNATURE_FORMAT.test(signature)) return reject(c, 'malformed_header')

  // Raw bytes as received (as text); never re-serialized JSON.
  const body = await c.req.text()
  const expected = `sha256=${createHmac('sha256', appSecret).update(body).digest('hex')}`

  if (!safeEqual(signature.toLowerCase(), expected)) return reject(c, 'mismatch')

  c.set('rawBody', body)
  await next()
}
