import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, businesses } from '@bizbot/database'

type SubscribeRequest = {
  plan: 'starter' | 'growth' | 'pro'
}

type PlanConfig = {
  plan: 'starter' | 'growth' | 'pro'
  monthlyMessageLimit: number
  envPlanIdKey: string
}

const PLAN_CONFIGS: Record<string, PlanConfig> = {
  starter: {
    plan: 'starter',
    monthlyMessageLimit: 1000,
    envPlanIdKey: 'RAZORPAY_SUBSCRIPTION_PLAN_ID_STARTER',
  },
  growth: {
    plan: 'growth',
    monthlyMessageLimit: 5000,
    envPlanIdKey: 'RAZORPAY_SUBSCRIPTION_PLAN_ID_GROWTH',
  },
  pro: {
    plan: 'pro',
    monthlyMessageLimit: 1000000000,
    envPlanIdKey: 'RAZORPAY_SUBSCRIPTION_PLAN_ID_PRO',
  },
}

async function razorpayRequest(path: string, method: 'GET' | 'POST', body?: unknown): Promise<Response> {
  const keyId = process.env['RAZORPAY_KEY_ID']
  const keySecret = process.env['RAZORPAY_KEY_SECRET']

  if (!keyId || !keySecret) {
    throw new Error('Razorpay API keys are not configured')
  }

  const basic = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
  return fetch(`https://api.razorpay.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth()
  if (!session?.user?.email || !session.user.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: SubscribeRequest
  try {
    body = await req.json() as SubscribeRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const selectedPlan = PLAN_CONFIGS[body.plan]
  if (!selectedPlan) {
    return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
  }

  const [business] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      ownerName: businesses.ownerName,
      ownerEmail: businesses.ownerEmail,
      ownerPhone: businesses.ownerPhone,
      razorpayCustomerId: businesses.razorpayCustomerId,
    })
    .from(businesses)
    .where(
      and(
        eq(businesses.id, session.user.businessId),
        eq(businesses.ownerEmail, session.user.email)
      )
    )
    .limit(1)

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const planId = process.env[selectedPlan.envPlanIdKey]
  if (!planId) {
    return NextResponse.json(
      { error: `Missing ${selectedPlan.envPlanIdKey} in environment` },
      { status: 500 }
    )
  }

  try {
    let razorpayCustomerId = business.razorpayCustomerId

    if (!razorpayCustomerId) {
      const createCustomerRes = await razorpayRequest('customers', 'POST', {
        name: business.ownerName,
        email: business.ownerEmail,
        contact: business.ownerPhone || undefined,
        notes: {
          businessId: business.id,
          businessName: business.name,
        },
      })

      if (!createCustomerRes.ok) {
        const details = await createCustomerRes.text()
        return NextResponse.json({ error: 'Failed to create Razorpay customer', details }, { status: 400 })
      }

      const customer = await createCustomerRes.json() as { id: string }
      razorpayCustomerId = customer.id

      await db
        .update(businesses)
        .set({
          razorpayCustomerId,
          updatedAt: new Date(),
        })
        .where(eq(businesses.id, business.id))
    }

    const subscriptionRes = await razorpayRequest('subscriptions', 'POST', {
      plan_id: planId,
      customer_id: razorpayCustomerId,
      customer_notify: 1,
      total_count: 120,
      quantity: 1,
      notes: {
        businessId: business.id,
        plan: selectedPlan.plan,
        monthlyMessageLimit: String(selectedPlan.monthlyMessageLimit),
      },
    })

    if (!subscriptionRes.ok) {
      const details = await subscriptionRes.text()
      return NextResponse.json({ error: 'Failed to create subscription', details }, { status: 400 })
    }

    const subscription = await subscriptionRes.json() as {
      id: string
      status: string
      short_url?: string
      current_end?: number
    }

    await db
      .update(businesses)
      .set({
        razorpaySubscriptionId: subscription.id,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, business.id))

    if (subscription.status === 'active') {
      await db
        .update(businesses)
        .set({
          plan: selectedPlan.plan,
          monthlyMessageLimit: selectedPlan.monthlyMessageLimit,
          planExpiresAt: subscription.current_end
            ? new Date(subscription.current_end * 1000)
            : null,
          updatedAt: new Date(),
        })
        .where(eq(businesses.id, business.id))
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      checkoutUrl: subscription.short_url ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
