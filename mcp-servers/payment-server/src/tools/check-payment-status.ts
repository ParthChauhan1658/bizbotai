import Razorpay from 'razorpay'
import { db, orders, appointments } from '@bizbot/database'
import { eq } from 'drizzle-orm'

interface CheckPaymentStatusInput {
  order_id?: string
  appointment_id?: string
  payment_link_id?: string
}

interface CheckPaymentStatusResult {
  status?: string
  amount?: string | null
  paymentUrl?: string | null
  message?: string
  error?: string
}

export async function checkPaymentStatus(
  input: CheckPaymentStatusInput,
): Promise<CheckPaymentStatusResult> {
  const { order_id, appointment_id, payment_link_id } = input

  try {
    // Resolve via order record
    if (order_id) {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, order_id))
        .limit(1)

      if (!order) {
        return { error: `Order not found: ${order_id}` }
      }

      const status = order.paymentStatus
      return {
        status,
        amount: order.total,
        paymentUrl: order.razorpayPaymentLinkUrl,
        message: `Payment status: ${status}`,
      }
    }

    // Resolve via appointment record
    if (appointment_id) {
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, appointment_id))
        .limit(1)

      if (!appointment) {
        return { error: `Appointment not found: ${appointment_id}` }
      }

      const status = appointment.paymentStatus
      return {
        status,
        amount: appointment.amount,
        paymentUrl: appointment.razorpayPaymentLinkUrl,
        message: `Payment status: ${status}`,
      }
    }

    // Resolve directly from Razorpay API
    if (payment_link_id) {
      if (!process.env['RAZORPAY_KEY_ID']) {
        // Dev mock
        return {
          status: 'pending',
          amount: null,
          paymentUrl: `https://rzp.io/mock/${payment_link_id}`,
          message: `[DEV] Payment status: pending`,
        }
      }

      const razorpay = new Razorpay({
        key_id: process.env['RAZORPAY_KEY_ID']!,
        key_secret: process.env['RAZORPAY_KEY_SECRET']!,
      })

      const link = await razorpay.paymentLink.fetch(payment_link_id)
      const status = (link.status as string) ?? 'pending'
      const amountInr = link.amount
        ? String(Number(link.amount) / 100)
        : null

      return {
        status,
        amount: amountInr,
        paymentUrl: (link.short_url as string) ?? null,
        message: `Payment status: ${status}`,
      }
    }

    return {
      error:
        'Provide at least one of: order_id, appointment_id, or payment_link_id',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: message }
  }
}
