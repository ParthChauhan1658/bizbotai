import { db, customers, orders, appointments } from '@bizbot/database'
import { eq, and, desc } from 'drizzle-orm'

interface GetCustomerInput {
  businessId: string
  customerId: string
}

export async function getCustomer(input: GetCustomerInput) {
  const { businessId, customerId } = input

  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
    .limit(1)

  if (!customer) {
    return { error: 'Customer not found' }
  }

  // Fetch last 5 orders and last 3 appointments in parallel
  const [recentOrders, recentAppointments] = await Promise.all([
    db
      .select({
        orderNumber: orders.orderNumber,
        status: orders.status,
        total: orders.total,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(eq(orders.customerId, customerId), eq(orders.businessId, businessId)))
      .orderBy(desc(orders.createdAt))
      .limit(5),

    db
      .select({
        serviceName: appointments.serviceName,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        status: appointments.status,
      })
      .from(appointments)
      .where(and(eq(appointments.customerId, customerId), eq(appointments.businessId, businessId)))
      .orderBy(desc(appointments.createdAt))
      .limit(3),
  ])

  return {
    id: customer.id,
    name: customer.name ?? '',
    phone: customer.phone ?? '',
    waId: customer.waId,
    language: customer.language,
    tags: customer.tags,
    totalMessages: customer.totalMessages,
    totalOrders: customer.totalOrders,
    totalAppointments: customer.totalAppointments,
    totalSpent: customer.totalSpent,
    isBlocked: customer.isBlocked,
    recentOrders,
    recentAppointments,
  }
}
