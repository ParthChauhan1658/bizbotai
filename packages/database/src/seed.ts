import 'dotenv/config'
import { db, businesses } from './index'

async function seed() {
  console.log('Seeding test business...')

  await db.insert(businesses).values({
    name: 'Test Restaurant',
    slug: 'test-restaurant',
    ownerName: 'Parth',
    ownerEmail: 'parth@bizbot.test',
    ownerPhone: '918369263293',
    businessType: 'restaurant',
    waPhoneNumberId: '1048939461633995',
    waBusinessAccountId: '1660989508591050',
    waAccessToken: process.env['WA_ACCESS_TOKEN'],
    waWebhookVerifyToken: 'bizbot_verify_2026',
    waConnected: true,
    plan: 'trial',
    monthlyMessageLimit: 1000,
    isActive: true,
    onboardingCompleted: true,
    city: 'Mumbai',
    defaultLanguage: 'en',
  }).onConflictDoNothing()

  console.log('✅ Test business seeded')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
