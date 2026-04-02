/**
 * Seed script: populates the database with test data for dashboard development.
 * Usage:  pnpm --filter @bizbot/database db:seed
 */
import { db } from './client'
import {
  businesses, users, customers, conversations, messages,
  orders, menuItems, dailyAnalytics, knowledgeBase,
} from './schema/index'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const BIZ_ID = '00000000-0000-0000-0000-000000000001'

async function seed() {
  console.log('Seeding database...\n')

  // ── 1. Business ───────────────────────────────────────────────────────
  // Check if a business already exists (from old seed or onboarding)
  const [existingBiz] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .limit(1)

  let bizId: string

  if (existingBiz) {
    // Use existing business, update it with seed data
    bizId = existingBiz.id
    await db.update(businesses).set({
      name: 'Ideal Meet Point Family Restaurant',
      ownerName: 'Parth',
      ownerPhone: '918369263293',
      businessType: 'restaurant',
      waPhoneNumberId: '1048939461633995',
      waBusinessAccountId: '1660989508591050',
      waAccessToken: process.env['WA_ACCESS_TOKEN'] ?? '',
      waWebhookVerifyToken: 'bizbot_verify_2026',
      waConnected: true,
      plan: 'trial',
      monthlyMessageLimit: 1000,
      messagesUsedThisMonth: 486,
      onboardingCompleted: true,
      city: 'Nalasopara',
      state: 'Maharashtra',
      defaultLanguage: 'hi',
      supportedLanguages: ['en', 'hi'],
      businessHours: {
        mon: { open: '10:00', close: '23:00', closed: false },
        tue: { open: '10:00', close: '23:00', closed: false },
        wed: { open: '10:00', close: '23:00', closed: false },
        thu: { open: '10:00', close: '23:00', closed: false },
        fri: { open: '10:00', close: '23:00', closed: false },
        sat: { open: '10:00', close: '23:30', closed: false },
        sun: { open: '10:00', close: '23:30', closed: false },
      },
      updatedAt: new Date(),
    }).where(eq(businesses.id, existingBiz.id))
    console.log(`  = Updated existing business ${bizId}`)
  } else {
    // No business exists, insert fresh
    bizId = BIZ_ID
    await db.insert(businesses).values({
      id: BIZ_ID,
      name: 'Ideal Meet Point Family Restaurant',
      slug: 'ideal-meet-point-abc123',
      ownerName: 'Parth',
      ownerEmail: 'parth@bizbot.test',
      ownerPhone: '918369263293',
      businessType: 'restaurant',
      waPhoneNumberId: '1048939461633995',
      waBusinessAccountId: '1660989508591050',
      waAccessToken: process.env['WA_ACCESS_TOKEN'] ?? '',
      waWebhookVerifyToken: 'bizbot_verify_2026',
      waConnected: true,
      plan: 'trial',
      monthlyMessageLimit: 1000,
      messagesUsedThisMonth: 486,
      isActive: true,
      onboardingCompleted: true,
      city: 'Nalasopara',
      state: 'Maharashtra',
      defaultLanguage: 'hi',
      supportedLanguages: ['en', 'hi'],
      businessHours: {
        mon: { open: '10:00', close: '23:00', closed: false },
        tue: { open: '10:00', close: '23:00', closed: false },
        wed: { open: '10:00', close: '23:00', closed: false },
        thu: { open: '10:00', close: '23:00', closed: false },
        fri: { open: '10:00', close: '23:00', closed: false },
        sat: { open: '10:00', close: '23:30', closed: false },
        sun: { open: '10:00', close: '23:30', closed: false },
      },
    })
    console.log(`  + Created business ${bizId}`)
  }

  // ── 2. Link first user to business ────────────────────────────────────
  const [firstUser] = await db.select({ id: users.id, businessId: users.businessId }).from(users).limit(1)
  if (firstUser && !firstUser.businessId) {
    await db.update(users).set({ businessId: bizId }).where(eq(users.id, firstUser.id))
    console.log(`  + Linked user ${firstUser.id} → business`)
  } else if (firstUser) {
    console.log(`  = User already linked`)
  } else {
    console.log('  ! No users — log in first, then re-run')
  }

  // ── 3. Customers ──────────────────────────────────────────────────────
  const custData = [
    { name: 'Rahul Sharma', waId: '919876543001', lang: 'hi', tags: ['regular', 'veg'] },
    { name: 'Priya Patel', waId: '919876543002', lang: 'en', tags: ['new'] },
    { name: 'Amit Desai', waId: '919876543003', lang: 'hi', tags: ['regular'] },
    { name: 'Sneha Kulkarni', waId: '919876543004', lang: 'en', tags: ['vip'] },
    { name: 'Ravi Kumar', waId: '919876543005', lang: 'hi', tags: [] },
    { name: 'Anita Mehta', waId: '919876543006', lang: 'en', tags: ['regular'] },
    { name: 'Vikram Singh', waId: '919876543007', lang: 'hi', tags: ['new'] },
    { name: 'Pooja Joshi', waId: '919876543008', lang: 'en', tags: ['regular', 'non-veg'] },
  ]

  const custIds: string[] = []
  for (const c of custData) {
    const [ex] = await db.select({ id: customers.id }).from(customers).where(eq(customers.waId, c.waId)).limit(1)
    if (ex) { custIds.push(ex.id); continue }
    const id = randomUUID()
    await db.insert(customers).values({
      id, businessId: bizId, name: c.name, waId: c.waId, phone: `+${c.waId}`,
      language: c.lang, tags: c.tags,
      firstMessageAt: daysAgo(rand(3, 14)), lastMessageAt: daysAgo(rand(0, 2)),
      totalMessages: rand(5, 50), totalOrders: rand(0, 5), totalSpent: String(rand(200, 3000)),
    })
    custIds.push(id)
  }
  console.log(`  + ${custIds.length} customers`)

  // ── 4. Conversations + Messages ───────────────────────────────────────
  const statuses = ['active', 'active', 'active', 'closed', 'closed', 'closed', 'handed_off', 'active'] as const
  const sentiments = ['positive', 'neutral', 'negative', 'positive', 'neutral', 'positive', 'negative', 'neutral'] as const
  const models = ['claude-haiku-4-5', 'claude-haiku-4-5', 'claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-haiku-4-5']

  const userMsgs = [
    ['Hi', 'What veg starters do you have?', 'I\'ll take paneer tikka', 'Great, placing order'],
    ['Hello', 'Show me biryani options', 'Chicken dum biryani please', 'Delivery to Nalasopara East'],
    ['Menu please', 'Any offers today?', 'Ok give me butter chicken and naan'],
    ['Hi is this open?', 'Do you deliver to Bandra?', 'Ok thanks'],
    ['Order status?', 'BIZ-234521-XYZ', 'When will it arrive?'],
    ['Hi', 'I want to speak to the manager', 'The food was cold last time'],
    ['Namaste', 'Aaj ka special kya hai?', 'Mutton handi half please', 'Payment link bhejo'],
    ['Good evening', 'Table for 4 available?', 'Book for 8pm', 'Thank you'],
  ]

  const botMsgs = [
    ['Namaste! Welcome to Ideal Meet Point! How can I help?', 'Veg Starters: Paneer Tikka ₹150, Mushroom Tikka ₹150, Veg Seekh Kabab ₹180...', 'Great choice! Paneer Tikka ₹150. Shall I place the order?', 'Order placed! #BIZ-847291. Total: ₹157.50'],
    ['Hello! Welcome! What would you like?', 'Biryani: Chicken ₹190, Chicken Dum ₹230, Mutton ₹250...', 'Chicken Dum Biryani ₹230. Confirm?', 'Delivery ₹30. Total: ₹273. Payment link sent!'],
    ['Welcome! Here\'s today\'s menu...', 'Combo offer: Any main + 2 rotis at 10% off!', 'Butter Chicken Half ₹170 + 2 Butter Naan ₹60. Total: ₹241.50'],
    ['Yes, we\'re open until 11 PM!', 'We\'re in Nalasopara East. Bandra might be outside our zone. Let me check.', 'You\'re welcome!'],
    ['Let me look up your order.', 'Order BIZ-234521: Chicken Biryani x2. Status: Preparing.', 'Estimated 25-30 minutes.'],
    ['Hello! How can I help?', 'Let me connect you to the manager.', 'Sorry to hear that. Connecting you to Parth now.'],
    ['Namaste! Specials: IMP Mutton Handi ₹650, Chicken Rajdhani ₹210', 'Mutton Handi Half ₹360. Shall I order?', 'Razorpay payment link sent!', 'Payment received! Confirmed.'],
    ['Good evening! Checking availability...', 'Table for 4 available at 8 PM.', 'Booked! Table #7 at 8:00 PM.', 'See you soon!'],
  ]

  for (let i = 0; i < custIds.length; i++) {
    const convId = randomUUID()
    const startedAt = daysAgo(rand(1, 7))
    const uMsgs = userMsgs[i]!
    const bMsgs = botMsgs[i]!

    await db.insert(conversations).values({
      id: convId, businessId: bizId, customerId: custIds[i]!,
      status: statuses[i]!, sentiment: sentiments[i]!,
      messageCount: uMsgs.length + bMsgs.length,
      aiMessagesCount: bMsgs.length, humanMessagesCount: uMsgs.length,
      resolvedByAi: statuses[i] === 'closed', startedAt,
      lastMessageAt: daysAgo(rand(0, 1)),
      closedAt: statuses[i] === 'closed' ? daysAgo(0) : null,
      handedOffTo: statuses[i] === 'handed_off' ? 'Parth' : null,
      handedOffAt: statuses[i] === 'handed_off' ? daysAgo(0) : null,
    })

    const max = Math.max(uMsgs.length, bMsgs.length)
    for (let j = 0; j < max; j++) {
      const t = new Date(startedAt.getTime() + j * 30000)
      if (j < uMsgs.length) {
        await db.insert(messages).values({
          conversationId: convId, businessId: bizId, customerId: custIds[i]!,
          direction: 'inbound', messageType: 'text', content: uMsgs[j],
          waMessageId: `wamid_${convId.slice(0,8)}_in_${j}`, waStatus: 'read', waTimestamp: t, createdAt: t,
        })
      }
      if (j < bMsgs.length) {
        const rt = new Date(t.getTime() + 2000)
        await db.insert(messages).values({
          conversationId: convId, businessId: bizId, customerId: custIds[i]!,
          direction: 'outbound', messageType: 'text', content: bMsgs[j],
          waMessageId: `wamid_${convId.slice(0,8)}_out_${j}`, waStatus: 'delivered', waTimestamp: rt,
          aiGenerated: true, aiModel: models[i], aiTokensUsed: rand(100, 500),
          aiCostUsd: (rand(1, 10) / 10000).toFixed(4), aiLatencyMs: rand(800, 2500), createdAt: rt,
        })
      }
    }
  }
  console.log(`  + ${custIds.length} conversations with messages`)

  // ── 5. Menu Items ─────────────────────────────────────────────────────
  const menu = [
    { name: 'Paneer Tikka', price: '150', category: 'Veg Starters', veg: 'true' },
    { name: 'Chicken Tikka', price: '170', category: 'Tandoori', veg: 'false' },
    { name: 'Butter Chicken Half', price: '170', category: 'Chicken Main', veg: 'false' },
    { name: 'Butter Chicken Full', price: '320', category: 'Chicken Main', veg: 'false' },
    { name: 'Dal Makhani', price: '100', category: 'Veg Main', veg: 'true' },
    { name: 'Chicken Dum Biryani', price: '230', category: 'Biryani', veg: 'false' },
    { name: 'Veg Biryani', price: '140', category: 'Biryani', veg: 'true' },
    { name: 'Butter Naan', price: '30', category: 'Breads', veg: 'true' },
    { name: 'Tandoori Roti', price: '15', category: 'Breads', veg: 'true' },
    { name: 'Mutton Handi Half', price: '210', category: 'Mutton Main', veg: 'false' },
  ]
  const [exMenu] = await db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.businessId, BIZ_ID)).limit(1)
  if (!exMenu) {
    for (let i = 0; i < menu.length; i++) {
      await db.insert(menuItems).values({ businessId: bizId, name: menu[i]!.name, price: menu[i]!.price, category: menu[i]!.category, isVegetarian: menu[i]!.veg, sortOrder: i })
    }
    console.log(`  + ${menu.length} menu items`)
  }

  // ── 6. Orders ─────────────────────────────────────────────────────────
  const orderList = [
    { cust: 0, items: [{ name: 'Paneer Tikka', qty: 1, price: '150' }], total: '157.50', status: 'delivered', paid: 'paid' },
    { cust: 1, items: [{ name: 'Chicken Dum Biryani', qty: 1, price: '230' }], total: '273.00', status: 'preparing', paid: 'paid' },
    { cust: 2, items: [{ name: 'Butter Chicken Half', qty: 1, price: '170' }, { name: 'Butter Naan', qty: 2, price: '30' }], total: '241.50', status: 'pending', paid: 'unpaid' },
    { cust: 6, items: [{ name: 'Mutton Handi Half', qty: 1, price: '360' }], total: '378.00', status: 'confirmed', paid: 'paid' },
  ]
  for (let i = 0; i < orderList.length; i++) {
    const o = orderList[i]!
    await db.insert(orders).values({
      businessId: bizId, customerId: custIds[o.cust]!,
      orderNumber: `BIZ-${Date.now().toString().slice(-6)}-${String.fromCharCode(65+i)}${String.fromCharCode(66+i)}C`,
      items: o.items, subtotal: (parseFloat(o.total) / 1.05).toFixed(2),
      tax: (parseFloat(o.total) - parseFloat(o.total) / 1.05).toFixed(2), total: o.total,
      status: o.status, paymentStatus: o.paid,
      paidAt: o.paid === 'paid' ? daysAgo(rand(0, 3)) : null,
      deliveredAt: o.status === 'delivered' ? daysAgo(0) : null,
      createdAt: daysAgo(rand(0, 5)),
    })
  }
  console.log(`  + ${orderList.length} orders`)

  // ── 7. Daily Analytics (14 days) ──────────────────────────────────────
  for (let d = 0; d < 14; d++) {
    const dateStr = daysAgo(d).toISOString().split('T')[0]!
    await db.insert(dailyAnalytics).values({
      businessId: bizId, date: dateStr,
      messagesReceived: rand(30, 80), messagesSent: rand(25, 70),
      uniqueCustomers: rand(8, 25), newCustomers: rand(1, 5),
      ordersPlaced: rand(2, 12), ordersRevenue: String(rand(1000, 5000)),
      avgResponseTimeMs: rand(900, 2000), aiTokensUsed: rand(5000, 20000),
      aiCostUsd: (rand(10, 50) / 100).toFixed(2), handoffs: rand(0, 3),
    }).onConflictDoNothing()
  }
  console.log('  + 14 days of analytics')

  // ── 8. Knowledge Base (without embeddings) ────────────────────────────
  const kbArticles = [
    { title: 'Restaurant Info', content: 'Ideal Meet Point Family Restaurant, Nalasopara East. Open 10 AM - 11 PM daily. Owner: Parth.', contentType: 'system' },
    { title: 'Delivery Policy', content: 'Delivery within 5 km. Fee: ₹30 under ₹500, free above. ETA: 30-45 min.', contentType: 'policy' },
    { title: 'Payment Options', content: 'UPI, Razorpay payment links, cash on delivery. Online preferred for delivery.', contentType: 'faq' },
  ]
  const [exKb] = await db.select({ id: knowledgeBase.id }).from(knowledgeBase).where(eq(knowledgeBase.businessId, BIZ_ID)).limit(1)
  if (!exKb) {
    for (const a of kbArticles) {
      await db.insert(knowledgeBase).values({ businessId: bizId, title: a.title, content: a.content, contentType: a.contentType })
    }
    console.log(`  + ${kbArticles.length} KB articles`)
  }

  console.log('\nSeed complete!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
