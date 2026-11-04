import { sqliteTable, integer, text, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core'
import { users } from './users'
import { classes } from './classes'
import { schools } from './schools'

export const trainingTemplates = sqliteTable('training_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creationRequestId: text('creation_request_id'),
  teacherId: integer('teacher_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  schoolId: integer('school_id').references(() => schools.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  description: text('description'),
  objective: text('objective'),
  category: text('category').notNull(), // cardiovascular, muscular_endurance, muscular_strength, flexibility, warmup, cooldown
  estimatedDuration: integer('estimated_duration'), // minutes
  difficulty: text('difficulty').default('sederhana'), // mudah, sederhana, tinggi
  sets: integer('sets').default(3),
  reps: integer('reps').default(10),
  restSeconds: integer('rest_seconds').default(60),
  videoUrl: text('video_url'),
  safetyNotes: text('safety_notes'),
  status: text('status').default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  creationRequestIdUnique: uniqueIndex('training_templates_creation_request_id_unique').on(table.creationRequestId),
  schoolIdIdx: index('training_templates_school_id_idx').on(table.schoolId),
}))

export const trainingSchedules = sqliteTable('training_schedules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creationRequestId: text('creation_request_id'),
  teacherId: integer('teacher_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  classId: integer('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  trainingDate: text('training_date').notNull(), // YYYY-MM-DD
  dueDate: text('due_date').notNull(), // YYYY-MM-DD
  instructions: text('instructions'),
  evidenceRequired: integer('evidence_required', { mode: 'boolean' }).default(false),
  teacherNotes: text('teacher_notes'),
  status: text('status', { enum: ['draft', 'published', 'closed', 'archived'] }).notNull().default('published'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  creationRequestIdUnique: uniqueIndex('training_schedules_creation_request_id_unique').on(table.creationRequestId),
}))

export const trainingScheduleActivities = sqliteTable('training_schedule_activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  scheduleId: integer('schedule_id').notNull().references(() => trainingSchedules.id, { onDelete: 'cascade' }),
  templateId: integer('template_id').references(() => trainingTemplates.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  sets: integer('sets').default(3),
  reps: integer('reps').default(10),
  videoUrl: text('video_url'),
  orderIndex: integer('order_index').default(0),
})

export const trainingAssignments = sqliteTable('training_assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  scheduleId: integer('schedule_id').notNull().references(() => trainingSchedules.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['not_started', 'in_progress', 'submitted', 'approved', 'needs_correction', 'rejected', 'missed'] })
    .notNull()
    .default('not_started'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const trainingSubmissions = sqliteTable('training_submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assignmentId: integer('assignment_id').notNull().references(() => trainingAssignments.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  scheduleId: integer('schedule_id').notNull().references(() => trainingSchedules.id, { onDelete: 'cascade' }),
  submissionDate: text('submission_date').notNull(), // ISO Date String
  durationMinutes: integer('duration_minutes'),
  setsCompleted: integer('sets_completed'),
  repsCompleted: integer('reps_completed'),
  studentNotes: text('student_notes'),
  teacherFeedback: text('teacher_feedback'),
  reviewStatus: text('review_status', { enum: ['submitted', 'approved', 'needs_correction', 'rejected'] }).notNull().default('submitted'),
  reviewedBy: integer('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: text('reviewed_at'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const submissionFiles = sqliteTable('submission_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  submissionId: integer('submission_id').notNull().references(() => trainingSubmissions.id, { onDelete: 'cascade' }),
  fileUrl: text('file_url').notNull(),
  fileName: text('file_name'),
  fileType: text('file_type'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

/**
 * Rekod Aktiviti Harian Murid (5 Aktiviti SEGAK)
 * Murid key-in setiap hari untuk pantauan kecergasan harian
 */
export const dailyActivityLogs = sqliteTable('daily_activity_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  logDate: text('log_date').notNull(), // YYYY-MM-DD
  warmupCompleted: integer('warmup_completed', { mode: 'boolean' }).default(true), // 1) Panaskan Badan (3 minit)
  curlUpReps: integer('curl_up_reps').default(0), // 2) Bangkit Tubi
  cardioDurationMinutes: integer('cardio_duration_minutes').default(3), // 3) Kardio / Naik Turun Bangku
  cardioPulseOrReps: integer('cardio_pulse_or_reps').default(0),
  pushUpReps: integer('push_up_reps').default(0), // 4) Tekan Tubi / Bangkit Tubi
  sitReachCm: real('sit_reach_cm').default(0), // 5) Jangkauan Melunjur / Otot Perut
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export type TrainingTemplateRow = typeof trainingTemplates.$inferSelect
export type TrainingScheduleRow = typeof trainingSchedules.$inferSelect
export type TrainingAssignmentRow = typeof trainingAssignments.$inferSelect
export type TrainingSubmissionRow = typeof trainingSubmissions.$inferSelect
export type DailyActivityLogRow = typeof dailyActivityLogs.$inferSelect
