import { Hono } from 'hono'

const router = new Hono()

router.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'webhook-server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

export { router as healthRouter }
