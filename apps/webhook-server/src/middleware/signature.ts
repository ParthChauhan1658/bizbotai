import { createHmac } from 'crypto'
import type { Context, Next } from 'hono'

export type AppVariables = {
  rawBody: string
}

export async function verifyWhatsAppSignature(c: Context, next: Next): Promise<void> {
  const signature = c.req.header('x-hub-signature-256')
  const appSecret = process.env['WA_APP_SECRET']

  if (!appSecret) {
    c.status(500)
    await c.json({ error: 'App secret not configured' })
    return
  }

  if (!signature) {
    c.status(401)
    await c.json({ error: 'Missing signature' })
    return
  }

  const body = await c.req.text()
  const expected = `sha256=${createHmac('sha256', appSecret).update(body).digest('hex')}`

  if (signature !== expected) {
    c.status(403)
    await c.json({ error: 'Invalid signature' })
    return
  }

  // Re-attach body as JSON for downstream handlers
  c.set('rawBody', body)
  await next()
}
