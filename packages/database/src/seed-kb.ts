import 'dotenv/config'
import { db, businesses, knowledgeBase } from './index'
import { eq } from 'drizzle-orm'
import { generateEmbeddingBatch } from '@bizbot/ai-prompts'

const KB_ITEMS = [
  {
    title: 'Beverages',
    content: `BEVERAGES:
- Soft Drink 300ml: ₹30
- Soft Drink 500ml: ₹50
- Butter Milk: ₹40
- Lassi: ₹60
- Soda 300ml: ₹20
- Soda 500ml: ₹30
- Fresh Lime Soda: ₹40
- Fresh Lime Water: ₹30
- Mineral Water: ₹20
- Red Bull: ₹130`,
    contentType: 'menu',
  },
  {
    title: 'Soups — Veg and Non-Veg',
    content: `VEG SOUPS (₹70-80 each):
- Cream of Tomato: ₹80
- Veg Manchow Soup: ₹80
- Veg Sweet Corn Soup: ₹80
- Veg Hot & Sour Soup: ₹80
- Veg Royal Soup: ₹80
- Veg Clear Soup: ₹70
- Cream of Veg: ₹80

NON-VEG SOUPS (₹85 each):
- Cream of Chicken Soup: ₹85
- Chicken Manchow Soup: ₹85
- Chicken Sweet Corn Soup: ₹85
- Chicken Hot & Sour Soup: ₹85
- Chicken Royal Soup: ₹85
- Chicken Clear Soup: ₹85
- Chicken Lung Fung Soup: ₹85
- Mutton Paya Soup: ₹120`,
    contentType: 'menu',
  },
  {
    title: 'Veg Starters',
    content: `VEG STARTERS:
- Veg Hara Bhara Kabab: ₹110
- Finger Chips: ₹80
- Veg Pakoda: ₹80
- Paneer/Cheese Pakoda: ₹110
- Aloo Chat: ₹70
- Aloo Jeera: ₹80
- Chana Garlic Oil Fry: ₹100
- Veg Seekh Kabab: ₹180
- Paneer Tikka: ₹150
- Mushroom Tikka: ₹150
- Tandoori Gobi: ₹100
- Paneer Reshmi Tikka: ₹160
- Cheese Cherry Pineapple: ₹110
- Paneer Ghee Roast: ₹220
- Mushroom Ghee Roast: ₹220
- Kaju Ghee Roast: ₹220
- Chana Kollwada: ₹90
- Kaju Fry: ₹190

IMP SPECIAL VEG STARTERS:
- Veg Suneri Tikki: ₹210
- Veg Badami Tikki: ₹210
- Veg Combo Tikki: ₹240
- Paneer Thread Crispy: ₹240`,
    contentType: 'menu',
  },
  {
    title: 'Non-Veg Starters and Tandoori Kababs',
    content: `NON-VEG STARTERS:
- Chicken Novelty Full/Half: ₹350/₹200
- Chicken Tawa Roast: ₹200
- Chicken Koliwada: ₹140
- Tita Liver Tawa Roast: ₹130
- Tita Liver Oil Fry: ₹100
- Tita Liver Masala Fry: ₹120
- Chicken Ghee Roast: ₹220
- Mutton Ghee Roast: ₹320
- Chicken Oil Fry: ₹130
- Egg Pakoda: ₹60
- Egg Omelette: ₹50
- Egg Half Fry: ₹50
- Egg Tawa Fry: ₹60
- Egg Bhurji: ₹60
- Boiled Egg (2 pcs): ₹30

TANDOORI KABABS:
- Chicken Tandoori Full/Half: ₹260/₹150
- Chicken Kalimiri Tandoori Full/Half: ₹260/₹150
- Chicken Green Tandoori Full/Half: ₹260/₹150
- Chicken Tandoori Lollypop: ₹180
- Chicken Tikka: ₹170
- Chicken Tangdi Kabab (2 pcs): ₹210
- Chicken Kalimiri Kabab: ₹190
- Chicken Reshmi Kabab: ₹190
- Chicken Banjara Kabab: ₹190
- Chicken Pahadi Kabab: ₹190
- Chicken Adraki Kabab: ₹190
- Chicken Sheek Kabab: ₹190
- Chicken Kabab Platter: ₹700
- Chicken Malai Kabab: ₹200
- Chicken Kasturi Kabab: ₹230
- Mutton Sheek Kabab: ₹240

IMP SPECIAL NON-VEG STARTERS:
- Chicken Sonali Kabab: ₹260
- Chicken Afgani Kabab: ₹260
- Chicken Noorani Kabab: ₹260
- Chicken Gulmohar Kabab: ₹240
- Chicken Kalmi Kabab: ₹260
- Chicken Jeera Tandoori Full/Half: ₹550/₹290`,
    contentType: 'menu',
  },
  {
    title: 'Sea Foods',
    content: `SEA FOODS (APS = As Per Season, price varies):
- Fish Finger: ₹400
- Pomfret/Rawas/Surmai Tandoori: APS
- Pomfret/Rawas/Surmai Fry: APS
- Pomfret/Rawas/Surmai Tawa Fry: APS
- Pomfret/Rawas/Surmai Masala: APS
- King Prawns Tawa/Masala/Fry: APS
- Bangda Fry: ₹100
- Bangda Tawa Fry/Masala: ₹120
- Mandeli: ₹100
- Bombil Tawa Fry: ₹110
- Bombil Chilly: ₹130
- Prawns Koliwada/Chilly: APS
- Prawns Tawa Fry/Masala: APS
- Prawns Sukha: APS
- Prawns 65: APS
- Prawns Schezwan: APS
- Prawns Garlic/Ginger: APS
- Prawns Golden Fried: APS

Note: APS items are priced as per market availability. Please ask for today's price.`,
    contentType: 'menu',
  },
  {
    title: 'Veg Main Course — Tarkari Khazana',
    content: `VEG MAIN COURSE (TARKARI KHAZANA):
- Veg Kadai/Tawa: ₹130
- Veg Chilly Milly: ₹110
- Veg Kolhapuri: ₹100
- Veg Makhanwala: ₹110
- Mix Veg: ₹100
- Veg Patiyala: ₹140
- Veg Hyderabadi: ₹110
- Veg Handi: ₹130
- Paneer Masala: ₹150
- Paneer Makhanwala: ₹160
- Paneer Handi: ₹170
- Paneer Tikka Masala/Kadai/Tawa: ₹150
- Paneer Bhurji: ₹140
- Paneer Pasanda: ₹140
- Paneer Palak/Mutter Paneer: ₹140
- Paneer Mushroom Masala: ₹150
- Mushroom Masala: ₹150
- Mushroom Tikka Masala: ₹170
- Methi Malai Mutter: ₹130
- Chana Masala: ₹100
- Green Peas Masala: ₹100
- Alu Mutter/Alu Gobi: ₹100
- Alu Palak/Alu Methi: ₹100
- Bhendi Masala: ₹120
- Dum Aloo Punjabi: ₹130
- Veg Kheema: ₹130
- Dal Fry: ₹90
- Dal Tadka: ₹100
- Kaju Masala: ₹190
- Baigan Bartha: ₹120
- Shahi Paneer: ₹160

IMP SPECIAL VEG MAIN COURSE:
- IMP Special Veg: ₹290
- Paneer Diwani Handi: ₹440`,
    contentType: 'menu',
  },
  {
    title: 'Chicken Main Course — Khana Khazana',
    content: `CHICKEN MAIN COURSE (KHANA KHAZANA):
- Butter Chicken Full/Half: ₹320/₹170
- Murg Mussalam Full/Half: ₹500/₹270
- Chicken Matka Full/Half: ₹390/₹200
- Chicken Handi Full/Half: ₹360/₹190
- Chicken Lajawab: ₹190
- Chicken Kadai: ₹180
- Chicken Kolhapuri: ₹140
- Chicken Mogalai: ₹170
- Chicken Patiyala: ₹220
- Chicken Green Masala: ₹170
- Chicken Tikka Masala: ₹200
- Chicken Tawa Masala: ₹170
- Chicken Do Pyaza: ₹170
- Chicken Kheema: ₹160
- Chicken Hyderabadi: ₹170
- Chicken Masala: ₹130
- Chicken Masala Fry: ₹140
- Chicken Liver Masala: ₹120
- Chicken Sukha: ₹170
- Egg Masala: ₹90
- Egg Masala Fry: ₹100

IMP SPECIAL CHICKEN:
- Chicken Rajdhani: ₹210
- Chicken Rara: ₹260
- Chicken Special Malwani: ₹240
- Chicken Sabunum: ₹210
- Chicken Mumtaz: ₹290
- Chicken Batasha: ₹150
- Chicken Badami: ₹210
- Chicken IMP Special Handi Full/Half: ₹550/₹280
- IMP Gawati Chicken: APS
- Batter Tandoori: ₹160
- Batter Masala: ₹160`,
    contentType: 'menu',
  },
  {
    title: 'Mutton and Fish Main Course',
    content: `MUTTON MAIN COURSE (KHANA KHAZANA):
- Mutton Handi Full/Half: ₹400/₹210
- Mutton Kolhapuri: ₹180
- Mutton Do Pyaza: ₹200
- Mutton Green Masala: ₹210
- Mutton Rogan Josh: ₹210
- Gosht Bhuna: ₹200
- Mutton Kadai: ₹190
- Mutton Masala: ₹190
- Mutton Rara: ₹290

IMP SPECIAL MUTTON:
- IMP Special Mutton Handi/Malwani Full: ₹650
- IMP Special Mutton Handi/Malwani Half: ₹360

FISH MAIN COURSE:
- Fish South Indian Style: ₹160`,
    contentType: 'menu',
  },
  {
    title: 'Breads — Roti Ka Khazana',
    content: `BREADS (ROTI KA KHAZANA):
- Tandoori Roti: ₹15
- Butter Roti: ₹18
- Paratha/Naan/Kulcha: ₹22
- Butter Paratha/Butter Naan: ₹30
- Methi Paratha: ₹30
- Butter Lachedar Paratha: ₹50
- Paneer Stuffed Paratha: ₹70
- Cheese Naan: ₹80
- Garlic Naan: ₹55
- Cheese Garlic Naan: ₹80
- Aloo Paratha: ₹50
- Veg Stuffed Paratha: ₹50
- Basket Roti: ₹220`,
    contentType: 'menu',
  },
  {
    title: 'Biryani and Rice — Veg',
    content: `VEG BIRYANI AND RICE (BASMATI KHAZANA):
- Veg Biryani: ₹140
- Veg Dum Biryani: ₹160
- Veg Hyderabadi Biryani: ₹140
- Veg Handi Biryani: ₹160
- Paneer Biryani: ₹150
- Paneer Tikka Biryani: ₹180
- Veg Pulav: ₹120
- Green Peas Pulav: ₹120
- Veg Kashmiri Pulav: ₹130
- Paneer Pulav: ₹130
- Veg Tawa Pulav: ₹120
- Biryani Rice: ₹90
- Jeera Rice: ₹90
- Steam Rice Full: ₹80
- Steam Rice Half: ₹45
- Dal Khichdi: ₹110
- Dal Palak Khichdi: ₹120
- Curd Rice: ₹110

VEG DUM BIRYANI 1KG (TAKE HOME):
- Veg Dum Biryani 1kg: ₹800
- Veg Pulav 1kg: ₹700`,
    contentType: 'menu',
  },
  {
    title: 'Biryani and Rice — Non-Veg',
    content: `NON-VEG BIRYANI AND RICE:
- Chicken Biryani: ₹190
- Chicken Biryani Boneless: ₹210
- Chicken Tikka Biryani: ₹190
- Chicken Handi Biryani: ₹230
- Chicken Hyderabadi Biryani: ₹230
- Chicken Dum Biryani: ₹230
- Egg Biryani: ₹150
- Mutton Biryani: ₹250
- Mutton Hyderabadi Biryani: ₹250
- Mutton Handi Biryani: ₹250
- Mutton Dum Biryani: ₹270
- Prawns Biryani: ₹250
- Prawns Handi Biryani: ₹250
- Prawns Dum Biryani: ₹250
- Prawns Pulav: ₹170

NON-VEG BIRYANI 1KG (TAKE HOME):
- Chicken Dum Biryani 1kg: ₹950
- Chicken Tikka Biryani 1kg: ₹1050
- Mutton Dum Biryani 1kg: ₹1150
- Prawns Dum Biryani 1kg: ₹1200`,
    contentType: 'menu',
  },
  {
    title: 'Chinese Veg Appetizers and Rice Noodles',
    content: `VEG CHINESE APPETIZERS:
- Veg Chilly/Manchurian: ₹120
- Veg Spring Roll: ₹140
- Veg Crispy: ₹130
- Veg Lollypop: ₹110
- Gobi Chilly/Manchurian: ₹120
- Paneer Chilly/Manchurian: ₹140
- Paneer Schezwan/Ginger/Garlic: ₹140
- Paneer Crispy: ₹160
- Paneer Satay: ₹160
- Paneer 65: ₹140
- Mushroom Chilly/Manchurian: ₹140
- Baby Corn Chilly/Manchurian: ₹140
- Veg Chinese Bhel: ₹120

VEG FRIED RICE AND NOODLES:
- Veg Combination Rice: ₹150
- Veg Fried Rice: ₹120
- Veg Schezwan Fried Rice: ₹130
- Veg Singapore/Hongkong Rice: ₹150
- Veg Manchurian Fried Rice: ₹150
- Veg Triple Schezwan Fried Rice: ₹160
- Veg Choper Rice: ₹140
- Veg Hakka Noodles: ₹120
- Veg Schezwan Noodles: ₹130
- Veg Manchow Noodles: ₹150`,
    contentType: 'menu',
  },
  {
    title: 'Chinese Non-Veg Appetizers and Rice Noodles',
    content: `NON-VEG CHINESE APPETIZERS:
- Chicken Chilly/Manchurian: ₹150
- Chicken Lollypop: ₹160
- Chicken Crispy: ₹180
- Chicken Spring Roll: ₹170
- Chicken 65: ₹180
- Chicken Satay: ₹180
- Chicken Schezwan: ₹180
- Chicken Ginger/Garlic: ₹180
- Chicken Hot Garlic: ₹180
- Chicken Sweet & Sour: ₹180
- Chicken Apple: ₹190
- Egg Chilly: ₹110
- Chicken Chinese Bhel: ₹150

NON-VEG FRIED RICE AND NOODLES:
- Chicken Fried Rice: ₹140
- Chicken Schezwan Fried Rice: ₹150
- Chicken Hongkong/Singapore Fried Rice: ₹160
- Chicken Combination Fried Rice: ₹160
- Chicken Manchurian Fried Rice: ₹170
- Chicken Choper Fried Rice: ₹160
- Chicken Triple Schezwan Fried Rice: ₹200
- Chicken Ginger Fried Rice: ₹160
- Chicken Garlic Fried Rice: ₹160
- Egg Fried Rice: ₹110
- Egg Schezwan Fried Rice: ₹120
- Mixed Fried Rice: ₹210
- Mixed Schezwan Fried Rice: ₹220
- Prawns Fried Rice: ₹190
- Prawns Schezwan Fried Rice: ₹200
- Chicken Hakka Noodles: ₹130
- Chicken Schezwan Noodles: ₹140
- Chicken Manchurian Noodles: ₹170
- Prawns Hakka Noodles: ₹170
- Prawns Schezwan Noodles: ₹180
- Prawns Triple Schezwan Noodles: ₹260
- Mixed Hakka Noodles: ₹210
- Mixed Triple Schezwan Fried Rice: ₹220`,
    contentType: 'menu',
  },
  {
    title: 'Snacks — Veg and Non-Veg',
    content: `VEG SNACKS:
- Veg Pizza: ₹130
- Cheese Pizza: ₹130
- Veg Special Pizza: ₹150
- Mushroom/Paneer Pizza: ₹150
- Veg Sandwich: ₹70
- Cheese Sandwich: ₹80
- Veg Franky: ₹70

NON-VEG SNACKS:
- Chicken Pizza: ₹140
- Chicken Cheese Pizza: ₹140
- Chicken Tikka Pizza: ₹170
- Tandoori Chicken Pizza: ₹170
- Chicken Sandwich: ₹80
- Chicken Cheese Sandwich: ₹80
- Chicken Franky: ₹80
- Chicken Roll: ₹70
- Egg Roll: ₹70`,
    contentType: 'menu',
  },
  {
    title: 'Accompaniments and Salads',
    content: `ACCOMPANIMENTS (KHANE KE SAATH-SAATH):
- Mini Salad: ₹20
- Green Salad: ₹30
- Curd: ₹15
- Veg Raita: ₹30
- Boondi Raita: ₹20
- Pineapple Raita: ₹25
- Fry Papad: ₹15
- Roasted Papad: ₹15
- Masala Papad: ₹20
- Kicha Papad Roast: ₹20
- Kicha Papad Fry: ₹25
- Masala Kicha Papad: ₹30`,
    contentType: 'menu',
  },
]

async function seedKB() {
  console.log('Finding business...')

  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.waPhoneNumberId, '1048939461633995'))
    .limit(1)

  if (!business) {
    console.error('Business not found. Run db:seed first.')
    process.exit(1)
  }

  console.log(`Found business: ${business.id}`)

  // Clear existing KB items
  await db.delete(knowledgeBase).where(eq(knowledgeBase.businessId, business.id))
  console.log('Cleared existing KB items')

  console.log(`Generating embeddings for ${KB_ITEMS.length} KB items...`)
  const texts = KB_ITEMS.map((item) => `${item.title}\n${item.content}`)
  const embeddings = await generateEmbeddingBatch(texts)

  console.log('Inserting KB items...')
  for (let i = 0; i < KB_ITEMS.length; i++) {
    const item = KB_ITEMS[i]!
    const embedding = embeddings[i]!

    await db.insert(knowledgeBase).values({
      businessId: business.id,
      title: item.title,
      content: item.content,
      contentType: item.contentType as 'menu' | 'faq',
      embedding,
      isActive: true,
      sortOrder: String(i),
    })

    console.log(`  ✓ ${item.title}`)
  }

  console.log(`\n✅ Seeded ${KB_ITEMS.length} KB items with real menu data`)
  process.exit(0)
}

seedKB().catch((err) => {
  console.error('KB seed failed:', err)
  process.exit(1)
})
