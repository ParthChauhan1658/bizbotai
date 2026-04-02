import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import { createOrder } from './tools/create-order.js'
import { getOrder } from './tools/get-order.js'
import { listMenu } from './tools/list-menu.js'

const PORT = process.env['PORT'] ?? 4002

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')) }
      catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

const server = createServer(async (req, res) => {
  const url = req.url ?? ''
  const method = req.method ?? ''

  // Health check
  if (method === 'GET' && url === '/health') {
    return send(res, 200, { ok: true, server: 'order-server' })
  }

  // Tool routes
  if (method === 'POST' && url.startsWith('/tools/')) {
    const toolName = url.slice('/tools/'.length)

    try {
      const body = await readBody(req)

      if (toolName === 'create_order') {
        const result = await createOrder(body as Parameters<typeof createOrder>[0])
        return send(res, 200, { success: true, result })
      }

      if (toolName === 'get_order') {
        const result = await getOrder(body as Parameters<typeof getOrder>[0])
        return send(res, 200, { success: true, result })
      }

      if (toolName === 'list_menu') {
        const result = await listMenu(body as Parameters<typeof listMenu>[0])
        return send(res, 200, { success: true, result })
      }

      return send(res, 404, { success: false, error: `Unknown tool: ${toolName}` })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return send(res, 500, { success: false, error: message })
    }
  }

  return send(res, 404, { success: false, error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`[order-server] listening on port ${PORT}`)
})
