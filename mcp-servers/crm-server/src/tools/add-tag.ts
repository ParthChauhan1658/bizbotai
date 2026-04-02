import { db, customers } from '@bizbot/database'
import { eq, and } from 'drizzle-orm'

interface AddTagInput {
  businessId: string
  customerId: string
  tag: string
}

export async function addTag(input: AddTagInput) {
  const { businessId, customerId, tag } = input

  // Fetch current tags
  const [customer] = await db
    .select({ tags: customers.tags })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
    .limit(1)

  if (!customer) {
    return { success: false, error: 'Customer not found.' }
  }

  const currentTags = customer.tags ?? []

  if (currentTags.includes(tag)) {
    return { success: true, tags: currentTags, message: 'Tag already exists' }
  }

  const newTags = [...currentTags, tag]

  await db
    .update(customers)
    .set({ tags: newTags })
    .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))

  return {
    success: true,
    tags: newTags,
    message: `Tag '${tag}' added to customer`,
  }
}
