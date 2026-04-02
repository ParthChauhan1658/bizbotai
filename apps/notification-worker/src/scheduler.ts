import { Queue, Worker, Job } from 'bullmq'
import { eq } from 'drizzle-orm'
import { db, customers, appointments, businesses } from '@bizbot/database'
import { sendTextMessage } from './whatsapp-sender.js'

// Parse Redis URL into BullMQ connection options to avoid ioredis version conflicts
function getRedisConnection() {
  const url = new URL(process.env['REDIS_URL']!)
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    username: url.username || undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null as unknown as number,
  }
}

const connection = getRedisConnection()

export const reminderQueue = new Queue('appointment-reminders', { connection })

export interface ReminderJobData {
  appointmentId: string
  businessId: string
  customerId: string
  reminderType: '24h' | '1h'
  serviceName: string
  appointmentDate: string
  startTime: string
}

// Schedule both reminders when a booking is created
export async function scheduleReminders(data: {
  appointmentId: string
  businessId: string
  customerId: string
  serviceName: string
  appointmentDate: string // YYYY-MM-DD
  startTime: string       // HH:mm
}): Promise<void> {
  const { appointmentDate, startTime } = data

  // Parse appointment datetime
  const [year, month, day] = appointmentDate.split('-').map(Number)
  const [hour, minute] = startTime.split(':').map(Number)
  const appointmentMs = new Date(year!, month! - 1, day!, hour!, minute!).getTime()
  const now = Date.now()

  // Schedule 24h reminder
  const delay24h = appointmentMs - 24 * 60 * 60 * 1000 - now
  if (delay24h > 0) {
    await reminderQueue.add(
      'reminder',
      { ...data, reminderType: '24h' } satisfies ReminderJobData,
      {
        delay: delay24h,
        jobId: `reminder-24h-${data.appointmentId}`,
        removeOnComplete: true,
        removeOnFail: 3,
      }
    )
    console.log(`Scheduled 24h reminder for appointment ${data.appointmentId} in ${Math.round(delay24h / 3600000)}h`)
  }

  // Schedule 1h reminder
  const delay1h = appointmentMs - 60 * 60 * 1000 - now
  if (delay1h > 0) {
    await reminderQueue.add(
      'reminder',
      { ...data, reminderType: '1h' } satisfies ReminderJobData,
      {
        delay: delay1h,
        jobId: `reminder-1h-${data.appointmentId}`,
        removeOnComplete: true,
        removeOnFail: 3,
      }
    )
    console.log(`Scheduled 1h reminder for appointment ${data.appointmentId} in ${Math.round(delay1h / 3600000)}h`)
  }
}

// BullMQ worker — processes reminders when they fire
export function startReminderWorker(): Worker {
  const worker = new Worker<ReminderJobData>(
    'appointment-reminders',
    async (job: Job<ReminderJobData>) => {
      const { appointmentId, businessId, customerId, reminderType, serviceName, appointmentDate, startTime } = job.data

      // Load customer WA ID
      const [customer] = await db
        .select({ waId: customers.waId, name: customers.name })
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1)

      if (!customer) {
        console.warn(`Reminder: customer ${customerId} not found`)
        return
      }

      // Load business WA credentials
      const [business] = await db
        .select({ waPhoneNumberId: businesses.waPhoneNumberId, waAccessToken: businesses.waAccessToken })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1)

      if (!business?.waPhoneNumberId || !business?.waAccessToken) {
        console.warn(`Reminder: business ${businessId} missing WA credentials`)
        return
      }

      // Mark reminder as sent in DB
      if (reminderType === '24h') {
        await db.update(appointments).set({ reminder24hSent: true }).where(eq(appointments.id, appointmentId))
      } else {
        await db.update(appointments).set({ reminder1hSent: true }).where(eq(appointments.id, appointmentId))
      }

      const timeLabel = reminderType === '24h' ? 'tomorrow' : 'in 1 hour'
      const name = customer.name ?? 'there'
      const message = `Hi ${name}! 📅 Reminder: Your *${serviceName}* appointment is ${timeLabel} on ${appointmentDate} at ${startTime}. Reply CANCEL to cancel or CONFIRM to confirm. See you soon!`

      await sendTextMessage({
        phoneNumberId: business.waPhoneNumberId,
        accessToken: business.waAccessToken,
        to: customer.waId,
        message,
      })

      console.log(`Sent ${reminderType} reminder for appointment ${appointmentId} to ${customer.waId}`)
    },
    { connection }
  )

  worker.on('failed', (job, err) => {
    console.error(`Reminder job ${job?.id} failed:`, err.message)
  })

  return worker
}
