import Redis from 'ioredis'

export interface StreamMessage {
  id: string
  eventName: string
  payload: Record<string, unknown>
  timestamp: number
}

export interface ConsumerOptions {
  stream: string
  group: string
  consumer: string
  count?: number
  blockMs?: number
}

export class EventConsumer {
  private redis: Redis

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null })
  }

  // Create consumer group (idempotent — safe to call on startup)
  async createGroup(stream: string, group: string): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', stream, group, '$', 'MKSTREAM')
    } catch (err: unknown) {
      // BUSYGROUP error means group already exists — that's fine
      if (err instanceof Error && !err.message.includes('BUSYGROUP')) {
        throw err
      }
    }
  }

  // Read new messages from consumer group
  async readMessages(options: ConsumerOptions): Promise<StreamMessage[]> {
    const { stream, group, consumer, count = 10, blockMs = 2000 } = options

    const results = await this.redis.xreadgroup(
      'GROUP', group, consumer,
      'COUNT', count,
      'BLOCK', blockMs,
      'STREAMS', stream, '>'
    ) as Array<[string, Array<[string, string[]]>]> | null

    if (!results) return []

    const messages: StreamMessage[] = []

    for (const [, entries] of results) {
      for (const [id, fields] of entries) {
        const data: Record<string, string> = {}
        for (let i = 0; i < fields.length; i += 2) {
          data[fields[i] as string] = fields[i + 1] as string
        }

        try {
          messages.push({
            id,
            eventName: data['eventName'] ?? '',
            payload: data['payload'] ? JSON.parse(data['payload']) : {},
            timestamp: parseInt(data['timestamp'] ?? '0'),
          })
        } catch {
          // skip malformed messages
        }
      }
    }

    return messages
  }

  // Acknowledge processed message
  async ack(stream: string, group: string, messageId: string): Promise<void> {
    await this.redis.xack(stream, group, messageId)
  }

  // Reclaim messages that have been pending too long (crash recovery)
  async reclaimPending(stream: string, group: string, consumer: string, minIdleMs = 30000): Promise<StreamMessage[]> {
    const pending = await this.redis.xautoclaim(
      stream, group, consumer,
      minIdleMs, '0-0',
      'COUNT', '10'
    ) as [string, Array<[string, string[]]>]

    if (!pending?.[1]) return []

    const messages: StreamMessage[] = []
    for (const [id, fields] of pending[1]) {
      const data: Record<string, string> = {}
      for (let i = 0; i < fields.length; i += 2) {
        data[fields[i] as string] = fields[i + 1] as string
      }
      try {
        messages.push({
          id,
          eventName: data['eventName'] ?? '',
          payload: data['payload'] ? JSON.parse(data['payload']) : {},
          timestamp: parseInt(data['timestamp'] ?? '0'),
        })
      } catch {
        // skip malformed
      }
    }
    return messages
  }

  async disconnect(): Promise<void> {
    await this.redis.quit()
  }
}
