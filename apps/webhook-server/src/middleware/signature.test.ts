import { createHmac } from 'crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { verifyWhatsAppSignature, type AppVariables } from './signature'

const SECRET = 'test-app-secret-not-real'
const BODY = JSON.stringify({ object: 'whatsapp_business_account', entry: [] })

const sign = (body: string, secret = SECRET) =>
  `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`

// Hand-written (not JSON.stringify output): spaces, newline and tab that a re-serializer would drop.
const SPACED_BODY = '{ "object" : "whatsapp_business_account",\n\t"entry" : [ ] }'

// `downstream` stands in for the LLM / DB / queue logic: it must never run on a rejected request.
const downstream = vi.fn()

function makeApp() {
  const app = new Hono<{ Variables: AppVariables }>()
  app.post('/webhook', verifyWhatsAppSignature, (c) => {
    downstream(c.get('rawBody'))
    return c.json({ status: 'ok' })
  })
  return app
}

const post = (headers: Record<string, string>, body = BODY) =>
  makeApp().request('/webhook', { method: 'POST', headers, body })

describe('verifyWhatsAppSignature', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>
  const lastReason = () => JSON.parse(String(warnSpy.mock.calls.at(-1)?.[0])).reason as string
  const original = process.env['WA_APP_SECRET']

  beforeEach(() => {
    process.env['WA_APP_SECRET'] = SECRET
    downstream.mockClear()
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined) // silence + inspect
  })
  afterEach(() => {
    vi.restoreAllMocks()
    if (original === undefined) delete process.env['WA_APP_SECRET']
    else process.env['WA_APP_SECRET'] = original
  })

  it('accepts a valid signature and passes the raw body downstream', async () => {
    const res = await post({ 'x-hub-signature-256': sign(BODY) })
    expect(res.status).toBe(200)
    expect(downstream).toHaveBeenCalledWith(BODY)
  })

  it('rejects an invalid signature with 401', async () => {
    const res = await post({ 'x-hub-signature-256': sign(BODY, 'wrong-secret') })
    expect(res.status).toBe(401)
    expect(downstream).not.toHaveBeenCalled()
  })

  it('rejects a missing header with 401', async () => {
    const res = await post({})
    expect(res.status).toBe(401)
    expect(lastReason()).toBe('missing_header')
    expect(downstream).not.toHaveBeenCalled()
  })

  it.each([
    'abc',
    'sha256=',
    'sha256=zz',
    'sha1=' + 'a'.repeat(40),
    sign(BODY).slice(0, -2),
    sign(BODY).replace('sha256=', 'SHA256='), // valid digest, wrong-case prefix
    '', // empty header is malformed, not missing
  ])('rejects a malformed header (%s) as malformed_header with 401', async (header) => {
    const res = await post({ 'x-hub-signature-256': header })
    expect(res.status).toBe(401)
    expect(lastReason()).toBe('malformed_header')
    expect(downstream).not.toHaveBeenCalled()
  })

  it('accepts an uppercase hex digest behind the lowercase prefix', async () => {
    const [prefix, digest] = sign(BODY).split('=')
    const res = await post({ 'x-hub-signature-256': `${prefix}=${digest!.toUpperCase()}` })
    expect(res.status).toBe(200)
  })

  it('delivers the exact bytes of a whitespace-bearing body downstream', async () => {
    const res = await post({ 'x-hub-signature-256': sign(SPACED_BODY) }, SPACED_BODY)
    expect(res.status).toBe(200)
    expect(downstream).toHaveBeenCalledWith(SPACED_BODY)
  })

  it('verifies the HMAC over raw bytes when the body starts with a BOM', async () => {
    const bomBody = '\uFEFF' + BODY
    const res = await post({ 'x-hub-signature-256': sign(bomBody) }, bomBody)
    expect(res.status).toBe(200)
    expect(downstream).toHaveBeenCalledWith(BODY) // BOM stripped on decode, as before
  })

  it('rejects a tampered body with 401', async () => {
    const res = await post({ 'x-hub-signature-256': sign(BODY) }, BODY.replace('entry', 'entrY'))
    expect(res.status).toBe(401)
    expect(downstream).not.toHaveBeenCalled()
  })

  it('fails closed with 401 when the secret is not configured', async () => {
    delete process.env['WA_APP_SECRET']
    const res = await post({ 'x-hub-signature-256': sign(BODY) })
    expect(res.status).toBe(401)
    expect(downstream).not.toHaveBeenCalled()
  })

  it('does not leak the secret or signature in the response body', async () => {
    const sig = sign(BODY, 'wrong-secret')
    const res = await post({ 'x-hub-signature-256': sig })
    const text = await res.text()
    expect(text).not.toContain(SECRET)
    expect(text).not.toContain(sig)
  })
})
