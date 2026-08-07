import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const schools = sqliteTable('schools', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  address: text('address'),
  state: text('state'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export type SchoolRow = typeof schools.$inferSelect
export type NewSchoolRow = typeof schools.$inferInsert
