import Razorpay from 'razorpay'
import { db, orders, appointments } from '@bizbot/database'
import { eq } from 'drizzle-orm'

interface CreatePaymentLinkInput {
  businessId: string
  amount: string
  description: string
  order_id?: string
  appointment_id?: string
  customer_name?: string
  customer_phone?: string
}

interface CreatePaymentLinkResult {
  success: boolean
  paymentLinkId?: string
  paymentUrl?: string
  amount?: string
  message?: string
  error?: string
}

export async function createPaymentLink(
  input: CreatePaymentLinkInput,
): Promise<CreatePaymentLinkResult> {
  const {
    amount,
    description,
    order_id,
    appointment_id,
    customer_name,
    customer_phone,
  } = input

  // Dev mock: return a fake link when Razorpay is not configured
  if (!process.env['RAZORPAY_KEY_ID']) {
    const mockId = `mock_${Date.now()}`
    const mockUrl = `https://rzp.io/mock/${Date.now()}`
    return {
      success: true,
      paymentLinkId: mockId,
      paymentUrl: mockUrl,
      amount,
      message: `[DEV] Payment link for ₹${amount}: ${mockUrl}`,
    }
  }

  try {
    // Convert amount string (e.g. "499.00") to paise (49900)
    const amountPaise = parseInt(
      (parseFloat(amount) * 100).toFixed(0),
      10,
    )

    const razorpay = new Razorpay({
      key_id: process.env['RAZORPAY_KEY_ID']!,
      key_secret: process.env['RAZORPAY_KEY_SECRET']!,
    })

    const paymentLink = await razorpay.paymentLink.create({
      amount: amountPaise,
      currency: 'INR',
      description,
      customer: {
        name: customer_name || 'Customer',
        contact: customer_phone || '',
      },
      notify: { sms: false, email: false },
      reminder_enable: false,
      callback_url: process.env['RAZORPAY_CALLBACK_URL'] || '',
      callback_method: 'get',
    })

    const linkId = paymentLink.id as string
    const shortUrl = paymentLink.short_url as string

    // Persist link details back to the associated entity
    if (order_id) {
      await db
        .update(orders)
        .set({
          razorpayPaymentLinkId: linkId,
          razorpayPaymentLinkUrl: shortUrl,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order_id))
    }

    if (appointment_id) {
      await db
        .update(appointments)
        .set({
          razorpayPaymentLinkId: linkId,
          razorpayPaymentLinkUrl: shortUrl,
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, appointment_id))
    }

    return {
      success: true,
      paymentLinkId: linkId,
      paymentUrl: shortUrl,
      amount,
      message: `Payment link created: ${shortUrl}. Please complete payment of ₹${amount}`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}
