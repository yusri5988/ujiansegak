import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core'
import { users } from './users'

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('info'),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  targetUrl: text('target_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    details: text('details'),
    ipAddress: text('ip_address'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => ({
    userActionCreatedIdx: index('audit_logs_user_action_created_idx').on(table.userId, table.action, table.createdAt),
  }),
)

export const systemSettings = sqliteTable('system_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export type NotificationRow = typeof notifications.$inferSelect
export type AuditLogRow = typeof auditLogs.$inferSelect
export type SystemSettingRow = typeof systemSettings.$inferSelect
