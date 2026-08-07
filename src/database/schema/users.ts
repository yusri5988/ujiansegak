import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core'
import { schools } from './schools'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(), // Email for admin/teacher, ID Murid for student
  email: text('email'),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'teacher', 'student'] }).notNull(),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const teacherProfiles = sqliteTable('teacher_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const studentProfiles = sqliteTable('student_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentIdNum: text('student_id_num').notNull(),
  fullName: text('full_name').notNull(),
  gender: text('gender', { enum: ['L', 'P'] }).notNull(),
  dob: text('dob').notNull(), // YYYY-MM-DD
  heightCm: real('height_cm'),
  weightKg: real('weight_kg'),
  medicalNotes: text('medical_notes'),
  guardianName: text('guardian_name'),
  guardianPhone: text('guardian_phone'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
export type TeacherProfileRow = typeof teacherProfiles.$inferSelect
export type StudentProfileRow = typeof studentProfiles.$inferSelect
