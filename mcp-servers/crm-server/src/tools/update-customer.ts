import { db, customers } from '@bizbot/database'
import { eq, and } from 'drizzle-orm'

interface UpdateCustomerInput {
  businessId: string
  customerId: string
  name?: string
  email?: string
  language?: string
  notes?: string
}

export async function updateCustomer(input: UpdateCustomerInput) {
  const { businessId, customerId, name, email, language, notes } = input

  // Build update object with only provided fields
  const updates: Record<string, string> = {}
  if (name !== undefined) updates['name'] = name
  if (email !== undefined) updates['email'] = email
  if (language !== undefined) updates['language'] = language
  if (notes !== undefined) updates['notes'] = notes

  if (Object.keys(updates).length === 0) {
    return { success: false, error: 'No fields provided to update.' }
  }

  const updated = await db
    .update(customers)
    .set(updates)
    .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
    .returning({ id: customers.id })

  if (updated.length === 0) {
    return { success: false, error: 'Customer not found.' }
  }

  return { success: true, message: 'Customer updated successfully' }
}
