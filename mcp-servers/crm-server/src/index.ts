import http from 'http'
import type { IncomingMessage, ServerResponse } from 'http'
import { getCustomer } from './tools/get-customer.js'
import { updateCustomer } from './tools/update-customer.js'
import { addTag } from './tools/add-tag.js'

const PORT = process.env['PORT'] ?? 4005

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
    return sendJson(res, 200, { ok: true, server: 'crm-server' })
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
        case 'get_customer': {
          const result = await getCustomer(body as Parameters<typeof getCustomer>[0])
          return sendJson(res, 200, result)
        }
        case 'update_customer': {
          const result = await updateCustomer(body as Parameters<typeof updateCustomer>[0])
          return sendJson(res, 200, result)
        }
        case 'add_tag': {
          const result = await addTag(body as Parameters<typeof addTag>[0])
          return sendJson(res, 200, result)
        }
        default:
          return sendJson(res, 404, { error: `Unknown tool: ${toolName}` })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error'
      console.error(`[crm-server] Error in tool "${toolName}":`, err)
      return sendJson(res, 500, { error: message })
    }
  }

  return sendJson(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`[crm-server] Listening on port ${PORT}`)
})
