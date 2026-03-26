import { pgTable, uuid, varchar, text, boolean, timestamp, index, customType } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { businesses } from './businesses'

// pgvector custom type for Drizzle
const vector = (name: string, config: { dimensions: number }) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${config.dimensions})`
    },
    toDriver(value: number[]): string {
      return `[${value.join(',')}]`
    },
    fromDriver(value: string): number[] {
      return value
        .slice(1, -1)
        .split(',')
        .map(Number)
    },
  })(name)

export const knowledgeBase = pgTable(
  'knowledge_base',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),

    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(), // raw text content
    contentType: varchar('content_type', { length: 20 }).notNull(), // faq | menu | catalog | policy | custom | system

    // Vector embedding for semantic search (1536 dims for text-embedding-3-small)
    embedding: vector('embedding', { dimensions: 1536 }),

    // Source
    sourceUrl: text('source_url'), // if uploaded from URL
    sourceFileName: varchar('source_file_name', { length: 255 }), // if uploaded as file

    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: varchar('sort_order', { length: 10 }).default('0').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
  },
  (table) => [
    index('kb_business_idx').on(table.businessId, table.isActive),
    index('kb_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ]
)

export type KnowledgeBase = typeof knowledgeBase.$inferSelect
export type NewKnowledgeBase = typeof knowledgeBase.$inferInsert
