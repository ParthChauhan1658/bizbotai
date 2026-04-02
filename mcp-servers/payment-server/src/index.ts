import http from 'http'
import type { IncomingMessage, ServerResponse } from 'http'
import { createPaymentLink } from './tools/create-payment-link.js'
import { checkPaymentStatus } from './tools/check-payment-status.js'

const PORT = process.env['PORT'] || 4004

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => {
      data += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'))
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req

  // Health check
  if (method === 'GET' && url === '/health') {
    sendJson(res, 200, { ok: true, server: 'payment-server' })
    return
  }

  // Tool routes
  if (method === 'POST') {
    try {
      const body = await readBody(req)

      if (url === '/tools/create_payment_link') {
        const result = await createPaymentLink(body as Parameters<typeof createPaymentLink>[0])
        sendJson(res, 200, result)
        return
      }

      if (url === '/tools/check_payment_status') {
        const result = await checkPaymentStatus(body as Parameters<typeof checkPaymentStatus>[0])
        sendJson(res, 200, result)
        return
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      sendJson(res, 400, { success: false, error: message })
      return
    }
  }

  sendJson(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`Payment server listening on port ${PORT}`)
})
