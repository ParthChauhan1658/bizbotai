import { db, orders } from '@bizbot/database'

interface OrderItem {
  name: string
  quantity: number
  price: string
  notes?: string
}

interface CreateOrderInput {
  businessId: string
  customerId: string
  conversationId: string
  items: OrderItem[]
  delivery_type: 'pickup' | 'delivery' | 'dine_in'
  delivery_address?: string
  notes?: string
}

interface CreateOrderResult {
  success: true
  orderId: string
  orderNumber: string
  total: string
  status: 'pending'
  message: string
}

function generateOrderNumber(): string {
  const ts = String(Date.now()).slice(-6)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const rand = Array.from({ length: 3 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('')
  return `BIZ-${ts}-${rand}`
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const {
    businessId,
    customerId,
    conversationId,
    items,
    delivery_type,
    delivery_address,
    notes,
  } = input

  // Calculate totals
  const subtotalNum = items.reduce(
    (acc, item) => acc + parseFloat(item.price) * item.quantity,
    0,
  )
  const taxNum = subtotalNum * 0.05
  const deliveryFeeNum = delivery_type === 'delivery' ? 40 : 0
  const totalNum = subtotalNum + taxNum + deliveryFeeNum

  const subtotal = subtotalNum.toFixed(2)
  const tax = taxNum.toFixed(2)
  const deliveryFee = deliveryFeeNum.toFixed(2)
  const total = totalNum.toFixed(2)

  const orderNumber = generateOrderNumber()

  const itemsJson = items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    notes: item.notes ?? '',
  }))

  const [inserted] = await db
    .insert(orders)
    .values({
      businessId,
      customerId,
      conversationId,
      orderNumber,
      items: itemsJson,
      subtotal,
      tax,
      deliveryFee,
      discount: '0.00',
      total,
      status: 'pending',
      paymentStatus: 'unpaid',
      deliveryType: delivery_type,
      deliveryAddress: delivery_address ?? null,
      notes: notes ?? null,
    })
    .returning({ id: orders.id })

  return {
    success: true,
    orderId: inserted?.id ?? '',
    orderNumber,
    total,
    status: 'pending',
    message: `Order created! Total: ₹${total}`,
  }
}
