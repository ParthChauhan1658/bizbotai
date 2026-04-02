import { db, orders } from '@bizbot/database'
import { eq, and } from 'drizzle-orm'
import type { Order } from '@bizbot/database'

interface GetOrderInput {
  businessId: string
  orderId?: string
  orderNumber?: string
}

export async function getOrder(
  input: GetOrderInput,
): Promise<Order | { error: string }> {
  const { businessId, orderId, orderNumber } = input

  if (!orderId && !orderNumber) {
    return { error: 'Provide either orderId or orderNumber' }
  }

  const conditions = orderId
    ? and(eq(orders.id, orderId), eq(orders.businessId, businessId))
    : and(eq(orders.orderNumber, orderNumber!), eq(orders.businessId, businessId))

  const [order] = await db
    .select()
    .from(orders)
    .where(conditions)
    .limit(1)

  if (!order) {
    return { error: 'Order not found' }
  }

  return order
}
