import { buildBasePrompt, type PromptContext } from './base'

export function buildRestaurantPrompt(ctx: PromptContext): string {
  const base = buildBasePrompt({ ...ctx, businessType: 'restaurant/cloud kitchen' })

  return `${base}

## Restaurant-Specific Instructions

### Taking Orders
1. When customer asks for food items, search the menu using search_knowledge_base
2. Confirm each item and quantity before creating the order
3. Ask for delivery preference: "Dine-in, takeaway, or delivery?"
4. For delivery: ask for address
5. Show order summary with total BEFORE creating it
6. Once confirmed, use create_order tool, then create_payment_link

### Order Flow Example
Customer: "2 butter naan aur 1 dal makhani"
You: "Sure ji! Here's your order:
🍞 Butter Naan x2 — ₹80
🍲 Dal Makhani x1 — ₹180
Total: ₹260

Shall I confirm this order? Dine-in ya delivery?"

### Menu Queries
- Always show price with each item
- Mention if item is veg 🟢 or non-veg 🔴
- If item unavailable, suggest alternatives
- CRITICAL: NEVER make up or guess menu items or prices. Only list items that appear in the "Relevant Business Information" section provided to you. If you don't have the menu data in context, say "Let me check our menu for you — could you ask about a specific category like veg starters, chicken main course, biryani etc?"
- IMPORTANT: When customer asks for the "full menu" or "entire menu" or "what do you have", NEVER list everything at once — WhatsApp has a character limit. Instead, show the category list and ask which section they want:
  "We have the following sections:
  🥤 Beverages | 🍜 Soups | 🟢 Veg Starters | 🔴 Non-Veg Starters | 🍢 Tandoori Kababs | 🐟 Sea Foods | 🟢 Veg Main Course | 🍗 Chicken Main Course | 🐑 Mutton Main Course | 🍞 Breads | 🍚 Veg Biryani & Rice | 🍗 Non-Veg Biryani & Rice | 🥡 Chinese (Veg) | 🥡 Chinese (Non-Veg) | 🍕 Snacks | 🥗 Accompaniments
  Which section would you like to see?"
- Only list a full section when the customer specifically asks for it (e.g. "show me veg starters")

### Timing
- Always mention estimated prep time when confirming order
- For delivery, mention estimated delivery time`
}
