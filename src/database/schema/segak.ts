import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core'
import { schools } from './schools'
import { academicSessions, classes } from './classes'
import { users } from './users'

export const segakActivities = sqliteTable('segak_activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(), // BMI, STEP_TEST, PUSH_UP, CURL_UP, SIT_REACH
  name: text('name').notNull(), // e.g. Ujian Naik Turun Bangku 3 Minit
  description: text('description'),
  measurementType: text('measurement_type').notNull(), // bmi, count, cm, pulse
  unit: text('unit'), // ulangan, cm, bpm, kg/m2
  genderApplicability: text('gender_applicability', { enum: ['ALL', 'L', 'P'] }).default('ALL'),
  minAge: integer('min_age').default(9),
  maxAge: integer('max_age').default(17),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const segakScoringRules = sqliteTable('segak_scoring_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  activityCode: text('activity_code').notNull().references(() => segakActivities.code, { onDelete: 'cascade' }),
  gender: text('gender', { enum: ['ALL', 'L', 'P'] }).notNull(),
  age: integer('age').notNull(),
  minMeasurement: real('min_measurement').notNull(),
  maxMeasurement: real('max_measurement').notNull(),
  score: integer('score').notNull(), // 1 to 5
  performanceCategory: text('performance_category').notNull(), // Cemerlang, Tinggi, Sederhana, Perlu Perhatian, Rendah
  ruleVersion: text('rule_version').default('1.0'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const assessmentSessions = sqliteTable('assessment_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  academicSessionId: integer('academic_session_id').notNull().references(() => academicSessions.id, { onDelete: 'cascade' }),
  classId: integer('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  teacherId: integer('teacher_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), // e.g. Ujian SEGAK Penggal 1 2026
  assessmentDate: text('assessment_date').notNull(), // YYYY-MM-DD
  phase: text('phase', { enum: ['PENGGAL_1', 'PENGGAL_2'] }).notNull(),
  status: text('status', { enum: ['draft', 'active', 'completed', 'locked'] }).notNull().default('draft'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const assessmentResults = sqliteTable('assessment_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull().references(() => assessmentSessions.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  heightCm: real('height_cm').notNull(),
  weightKg: real('weight_kg').notNull(),
  calculatedBmi: real('calculated_bmi').notNull(),
  bmiCategory: text('bmi_category').notNull(),
  totalScore: integer('total_score').notNull().default(0),
  overallGrade: text('overall_grade'), // Sangat Tinggi, Tinggi, Sederhana, Perlu Perhatian, Sangat Rendah
  status: text('status', { enum: ['draft', 'finalized'] }).notNull().default('draft'),
  createdBy: integer('created_by').notNull().references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const assessmentResultItems = sqliteTable('assessment_result_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  resultId: integer('result_id').notNull().references(() => assessmentResults.id, { onDelete: 'cascade' }),
  activityCode: text('activity_code').notNull(),
  rawMeasurement: real('raw_measurement').notNull(),
  calculatedScore: integer('calculated_score').notNull(),
  performanceCategory: text('performance_category'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export type SegakActivityRow = typeof segakActivities.$inferSelect
export type SegakScoringRuleRow = typeof segakScoringRules.$inferSelect
export type AssessmentSessionRow = typeof assessmentSessions.$inferSelect
export type AssessmentResultRow = typeof assessmentResults.$inferSelect
export type AssessmentResultItemRow = typeof assessmentResultItems.$inferSelect
