import http from 'http'
import type { IncomingMessage, ServerResponse } from 'http'
import { checkAvailability } from './tools/check-availability.js'
import { createAppointment } from './tools/create-appointment.js'
import { listServices } from './tools/list-services.js'

const PORT = process.env['PORT'] ?? 4003

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')) }
      catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

const server = http.createServer(async (req, res) => {
  const url = req.url ?? ''
  const method = req.method ?? ''

  // Health check
  if (method === 'GET' && url === '/health') {
    return sendJson(res, 200, { ok: true, server: 'booking-server' })
  }

  // Tool routes
  if (method === 'POST' && url.startsWith('/tools/')) {
    const toolName = url.slice('/tools/'.length)

    let body: unknown
    try {
      body = await readBody(req)
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON body' })
    }

    try {
      switch (toolName) {
        case 'check_availability': {
          const result = await checkAvailability(body as Parameters<typeof checkAvailability>[0])
          return sendJson(res, 200, result)
        }
        case 'create_appointment': {
          const result = await createAppointment(body as Parameters<typeof createAppointment>[0])
          return sendJson(res, 200, result)
        }
        case 'list_services': {
          const result = await listServices(body as Parameters<typeof listServices>[0])
          return sendJson(res, 200, result)
        }
        default:
          return sendJson(res, 404, { error: `Unknown tool: ${toolName}` })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error'
      console.error(`[booking-server] Error in tool "${toolName}":`, err)
      return sendJson(res, 500, { error: message })
    }
  }

  return sendJson(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`[booking-server] Listening on port ${PORT}`)
})
