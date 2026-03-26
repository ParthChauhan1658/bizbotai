import 'dotenv/config'
import { EventConsumer, STREAMS, EVENTS, MessageReceivedEvent } from '@bizbot/events'
import { processMessage } from './processor'

const CONSUMER_GROUP = 'ai-processors'
const CONSUMER_NAME = `ai-worker-${process.pid}`
const STREAM = STREAMS.MESSAGES

const consumer = new EventConsumer(process.env['REDIS_URL']!)

let isShuttingDown = false

async function run(): Promise<void> {
  console.log(`AI Worker starting — consumer: ${CONSUMER_NAME}`)

  // Create consumer group (idempotent)
  await consumer.createGroup(STREAM, CONSUMER_GROUP)
  console.log(`Consumer group "${CONSUMER_GROUP}" ready on stream "${STREAM}"`)

  // On startup, reclaim any pending messages from crashed workers
  await reclaimAndProcess()

  console.log('Listening for messages...')

  while (!isShuttingDown) {
    try {
      const messages = await consumer.readMessages({
        stream: STREAM,
        group: CONSUMER_GROUP,
        consumer: CONSUMER_NAME,
        count: 5,
        blockMs: 2000,
      })

      for (const msg of messages) {
        if (msg.eventName !== EVENTS.MESSAGE_RECEIVED) {
          // Not our event — ack and skip
          await consumer.ack(STREAM, CONSUMER_GROUP, msg.id)
          continue
        }

        try {
          const event = MessageReceivedEvent.parse(msg.payload)
          await processMessage(event)
          await consumer.ack(STREAM, CONSUMER_GROUP, msg.id)
        } catch (err) {
          console.error(`Failed to process message ${msg.id}:`, err)
          // Do NOT ack — let it be reclaimed after timeout for retry
        }
      }
    } catch (err) {
      if (!isShuttingDown) {
        console.error('Consumer loop error:', err)
        // Brief pause before retrying on unexpected errors
        await sleep(1000)
      }
    }
  }
}

async function reclaimAndProcess(): Promise<void> {
  try {
    const pending = await consumer.reclaimPending(STREAM, CONSUMER_GROUP, CONSUMER_NAME, 30_000)
    if (pending.length > 0) {
      console.log(`Reclaimed ${pending.length} pending messages from crashed workers`)
      for (const msg of pending) {
        if (msg.eventName !== EVENTS.MESSAGE_RECEIVED) {
          await consumer.ack(STREAM, CONSUMER_GROUP, msg.id)
          continue
        }
        try {
          const event = MessageReceivedEvent.parse(msg.payload)
          await processMessage(event)
          await consumer.ack(STREAM, CONSUMER_GROUP, msg.id)
        } catch (err) {
          console.error(`Failed to reprocess pending message ${msg.id}:`, err)
        }
      }
    }
  } catch (err) {
    // xautoclaim may not be available on older Redis — non-fatal
    console.warn('Could not reclaim pending messages:', err)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  console.log(`\nReceived ${signal} — shutting down gracefully...`)
  isShuttingDown = true
  await consumer.disconnect()
  console.log('AI Worker stopped.')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

run().catch((err) => {
  console.error('Fatal error in AI Worker:', err)
  process.exit(1)
})
