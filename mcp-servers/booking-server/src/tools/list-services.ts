import { db, services } from '@bizbot/database'
import { eq, and } from 'drizzle-orm'

interface ListServicesInput {
  businessId: string
}

export async function listServices(input: ListServicesInput) {
  const { businessId } = input

  const rows = await db
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      durationMins: services.durationMins,
      price: services.price,
      category: services.category,
    })
    .from(services)
    .where(and(eq(services.businessId, businessId), eq(services.isActive, true)))

  return { services: rows }
}
