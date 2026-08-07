import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { schools } from './schools'
import { users } from './users'

export const academicSessions = sqliteTable('academic_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  name: text('name').notNull(), // e.g. "Sesi 2026/2027"
  isCurrent: integer('is_current', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const classes = sqliteTable('classes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  academicSessionId: integer('academic_session_id').notNull().references(() => academicSessions.id, { onDelete: 'cascade' }),
  teacherId: integer('teacher_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(), // e.g. "5 Cemerlang"
  status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const classStudents = sqliteTable('class_students', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  classId: integer('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['active', 'transferred', 'dropped'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export type AcademicSessionRow = typeof academicSessions.$inferSelect
export type ClassRow = typeof classes.$inferSelect
export type ClassStudentRow = typeof classStudents.$inferSelect
