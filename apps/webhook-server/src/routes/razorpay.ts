import { createHmac, timingSafeEqual } from 'crypto'
import { Hono } from 'hono'
import { and, eq } from 'drizzle-orm'
import { appointments, businesses, db, orders } from '@bizbot/database'

const router = new Hono()

type RazorpayEventPayload = {
  event?: string
  created_at?: number
  payload?: {
    payment?: {
      entity?: {
        id?: string
        payment_link_id?: string
      }
    }
    payment_link?: {
      entity?: {
        id?: string
      }
    }
    subscription?: {
      entity?: {
        id?: string
        plan_id?: string
        notes?: {
          businessId?: string
          plan?: string
          monthlyMessageLimit?: string
        }
        current_end?: number
      }
    }
  }
}

type PlanUpdate = {
  plan: string
  monthlyMessageLimit: number
}

function planFromPlanId(planId?: string): PlanUpdate | null {
  const starter = process.env['RAZORPAY_SUBSCRIPTION_PLAN_ID_STARTER']
  const growth = process.env['RAZORPAY_SUBSCRIPTION_PLAN_ID_GROWTH']
  const pro = process.env['RAZORPAY_SUBSCRIPTION_PLAN_ID_PRO']

  if (!planId) return null
  if (starter && planId === starter) return { plan: 'starter', monthlyMessageLimit: 1000 }
  if (growth && planId === growth) return { plan: 'growth', monthlyMessageLimit: 5000 }
  if (pro && planId === pro) return { plan: 'pro', monthlyMessageLimit: 1000000000 }
  return null
}

function verifyRazorpaySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const provided = Buffer.from(signature, 'utf8')
  const computed = Buffer.from(expected, 'utf8')

  if (provided.length !== computed.length) return false
  return timingSafeEqual(provided, computed)
}

function extractPaymentIds(body: RazorpayEventPayload): { paymentLinkId?: string; paymentId?: string } {
  const paymentId = body.payload?.payment?.entity?.id
  const paymentLinkId = body.payload?.payment?.entity?.payment_link_id
    ?? body.payload?.payment_link?.entity?.id

  const ids: { paymentLinkId?: string; paymentId?: string } = {}
  if (paymentLinkId) ids.paymentLinkId = paymentLinkId
  if (paymentId) ids.paymentId = paymentId
  return ids
}

router.post('/webhook/razorpay', async (c) => {
  const webhookSecret = process.env['RAZORPAY_WEBHOOK_SECRET']
  if (!webhookSecret) {
    return c.json({ error: 'RAZORPAY_WEBHOOK_SECRET not configured' }, 500)
  }

  const signature = c.req.header('x-razorpay-signature')
  if (!signature) {
    return c.json({ error: 'Missing x-razorpay-signature header' }, 401)
  }

  const rawBody = await c.req.text()
  if (!verifyRazorpaySignature(rawBody, signature, webhookSecret)) {
    return c.json({ error: 'Invalid signature' }, 403)
  }

  let body: RazorpayEventPayload
  try {
    body = JSON.parse(rawBody) as RazorpayEventPayload
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const eventName = body.event ?? 'unknown'

  if (eventName === 'subscription.activated' || eventName === 'subscription.charged') {
    const subscription = body.payload?.subscription?.entity
    const subscriptionId = subscription?.id
    const planFromNotes = subscription?.notes?.plan
    const limitFromNotes = Number(subscription?.notes?.monthlyMessageLimit)
    const planFromEnv = planFromPlanId(subscription?.plan_id)

    const plan = planFromNotes || planFromEnv?.plan
    const monthlyMessageLimit = Number.isFinite(limitFromNotes) && limitFromNotes > 0
      ? limitFromNotes
      : planFromEnv?.monthlyMessageLimit

    if (!subscriptionId || !plan || !monthlyMessageLimit) {
      return c.json({ status: 'ignored', reason: 'subscription mapping missing' }, 200)
    }

    const expiresAt = subscription?.current_end
      ? new Date(subscription.current_end * 1000)
      : null

    // Prefer explicit businessId in notes when available.
    if (subscription?.notes?.businessId) {
      const [updatedById] = await db
        .update(businesses)
        .set({
          plan,
          monthlyMessageLimit,
          razorpaySubscriptionId: subscriptionId,
          planExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(businesses.id, subscription.notes.businessId))
        .returning({ id: businesses.id })

      if (updatedById) {
        return c.json({ status: 'ok', entity: 'business', id: updatedById.id }, 200)
      }
    }

    const [updatedBySubscription] = await db
      .update(businesses)
      .set({
        plan,
        monthlyMessageLimit,
        planExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(businesses.razorpaySubscriptionId, subscriptionId))
      .returning({ id: businesses.id })

    if (updatedBySubscription) {
      return c.json({ status: 'ok', entity: 'business', id: updatedBySubscription.id }, 200)
    }

    return c.json({ status: 'ignored', reason: 'No matching business for subscription' }, 200)
  }

  if (eventName !== 'payment_link.paid' && eventName !== 'payment.captured') {
    return c.json({ status: 'ignored', event: eventName }, 200)
  }

  const { paymentLinkId, paymentId } = extractPaymentIds(body)
  if (!paymentLinkId) {
    return c.json({ status: 'ignored', reason: 'payment_link_id missing' }, 200)
  }

  const [updatedOrder] = await db
    .update(orders)
    .set({
      paymentStatus: 'paid',
      razorpayPaymentId: paymentId,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(orders.razorpayPaymentLinkId, paymentLinkId), eq(orders.paymentStatus, 'unpaid')))
    .returning({ id: orders.id })

  if (updatedOrder) {
    return c.json({ status: 'ok', entity: 'order', id: updatedOrder.id }, 200)
  }

  const [updatedAppointment] = await db
    .update(appointments)
    .set({
      paymentStatus: 'paid',
      razorpayPaymentId: paymentId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(appointments.razorpayPaymentLinkId, paymentLinkId),
        eq(appointments.paymentStatus, 'unpaid')
      )
    )
    .returning({ id: appointments.id })

  if (updatedAppointment) {
    return c.json({ status: 'ok', entity: 'appointment', id: updatedAppointment.id }, 200)
  }

  return c.json({ status: 'ignored', reason: 'No matching unpaid order/appointment' }, 200)
})

export { router as razorpayRouter }
