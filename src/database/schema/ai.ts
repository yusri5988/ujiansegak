import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { users } from './users'
import { schools } from './schools'

export const aiConversations = sqliteTable(
  'ai_conversations',
  {
    id: text('id').primaryKey(),
    teacherId: integer('teacher_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    schoolId: integer('school_id').references(() => schools.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => ({
    teacherUpdatedIdx: index('ai_conversations_teacher_updated_idx').on(table.teacherId, table.updatedAt),
  }),
)

export const aiMessages = sqliteTable(
  'ai_messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    conversationId: text('conversation_id').notNull().references(() => aiConversations.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => ({
    conversationCreatedIdx: index('ai_messages_conversation_created_idx').on(table.conversationId, table.createdAt),
  }),
)

export const aiPendingActions = sqliteTable(
  'ai_pending_actions',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id').notNull().references(() => aiConversations.id, { onDelete: 'cascade' }),
    teacherId: integer('teacher_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    schoolId: integer('school_id').references(() => schools.id, { onDelete: 'restrict' }),
    actionType: text('action_type', {
      enum: [
        'create_training_schedule',
        'update_training_schedule',
        'archive_training_schedule',
        'review_training_submission',
        'create_training_template',
        'update_training_template',
        'archive_training_template',
        'create_class',
        'update_class',
        'archive_class',
        'create_student',
        'import_students',
        'update_student_profile',
        'drop_student_from_class',
        'transfer_student',
        'update_teacher_profile',
        'reset_student_password',
        'create_segak_session',
        'record_segak_result',
        'update_segak_session_status',
      ],
    }).notNull(),
    payload: text('payload').notNull(),
    preview: text('preview').notNull(),
    status: text('status', { enum: ['pending', 'executing', 'confirmed', 'cancelled', 'failed', 'expired'] })
      .notNull()
      .default('pending'),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
  },
  (table) => ({
    teacherStatusIdx: index('ai_pending_actions_teacher_status_idx').on(table.teacherId, table.status),
  }),
)

export type AiConversationRow = typeof aiConversations.$inferSelect
export type AiMessageRow = typeof aiMessages.$inferSelect
export type AiPendingActionRow = typeof aiPendingActions.$inferSelect
