import { createHmac, timingSafeEqual } from 'crypto'
import type { Context, Next } from 'hono'

export type AppVariables = {
  rawBody: string
}

// Dependency-free logging so this module has no Redis/DB side effects.
function warn(msg: string, fields: Record<string, unknown> = {}): void {
  console.warn(JSON.stringify({ level: 'warn', service: 'webhook-server', msg, ...fields }))
}

// Meta sends `sha256=<64 hex chars>`: literal lowercase prefix, digest case-insensitive.
const SIGNATURE_FORMAT = /^sha256=[0-9a-f]{64}$/i
const PREFIX_LENGTH = 'sha256='.length
const SIGNATURE_PREFIX_OK = (h: string): boolean => h.startsWith('sha256=')

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
 * Verifies X-Hub-Signature-256 = "sha256=" + HMAC_SHA256(app secret, raw body bytes).
 * Any signature problem (missing/malformed header, missing secret, mismatch) returns 401
 * before any downstream handler runs. Errors while reading the request body are not
 * caught here and propagate to the app's error handler as before.
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
  if (signature === undefined) return reject(c, 'missing_header')
  if (!SIGNATURE_PREFIX_OK(signature) || !SIGNATURE_FORMAT.test(signature)) {
    return reject(c, 'malformed_header')
  }

  // HMAC over the exact bytes received; decode to text separately for downstream use.
  // TextDecoder drops a leading BOM, matching what c.req.text() gave consumers before.
  const bytes = Buffer.from(await c.req.arrayBuffer())
  const expected = createHmac('sha256', appSecret).update(bytes).digest('hex')

  if (!safeEqual(signature.slice(PREFIX_LENGTH).toLowerCase(), expected)) {
    return reject(c, 'mismatch')
  }

  c.set('rawBody', new TextDecoder().decode(bytes))
  await next()
}
