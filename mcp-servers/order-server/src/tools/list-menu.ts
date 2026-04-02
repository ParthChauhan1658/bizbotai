import { db, menuItems } from '@bizbot/database'
import { eq, and } from 'drizzle-orm'

interface ListMenuInput {
  businessId: string
  category?: string
}

interface MenuItemResult {
  name: string
  description: string
  price: string
  category: string
  isVegetarian: string
  isVegan: string
}

export async function listMenu(
  input: ListMenuInput,
): Promise<{ items: MenuItemResult[] }> {
  const { businessId, category } = input

  const conditions = category
    ? and(
        eq(menuItems.businessId, businessId),
        eq(menuItems.isAvailable, 'true'),
        eq(menuItems.category, category),
      )
    : and(
        eq(menuItems.businessId, businessId),
        eq(menuItems.isAvailable, 'true'),
      )

  const rows = await db
    .select({
      name: menuItems.name,
      description: menuItems.description,
      price: menuItems.price,
      category: menuItems.category,
      isVegetarian: menuItems.isVegetarian,
      isVegan: menuItems.isVegan,
    })
    .from(menuItems)
    .where(conditions)
    .orderBy(menuItems.sortOrder)

  const items: MenuItemResult[] = rows.map((r) => ({
    name: r.name,
    description: r.description ?? '',
    price: r.price,
    category: r.category ?? '',
    isVegetarian: r.isVegetarian ?? 'false',
    isVegan: r.isVegan ?? 'false',
  }))

  return { items }
}
