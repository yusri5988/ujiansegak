import { readFile } from 'node:fs/promises'
import { Miniflare } from 'miniflare'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import app from '@/app/app'
import { AuthService } from '@/app/Services/AuthService'
import { TrainingRepository } from '@/app/Repositories/TrainingRepository'
import { TrainingService } from '@/app/Services/TrainingService'
import { AuditRepository } from '@/app/Repositories/AuditRepository'
import { ClassRepository } from '@/app/Repositories/ClassRepository'

const student = { id: 3, username: 'student', role: 'student' } as const
const teacher = { id: 2, username: 'teacher', role: 'teacher' } as const
const mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response() } }', d1Databases: ['DB'] })
let db: D1Database

beforeAll(async () => {
  db = await mf.getD1Database('DB')
  const migration = await readFile('src/database/migrations/0000_oval_doctor_spectrum.sql', 'utf8')
  for (const statement of migration.split('--> statement-breakpoint')) {
    if (statement.trim()) await db.prepare(statement).run()
  }
  await db.batch([
    db.prepare("INSERT INTO smartfit_app_users (id, username, password_hash, role, created_at, updated_at) VALUES (2, 'teacher', 'test', 'teacher', 0, 0), (3, 'student', 'test', 'student', 0, 0), (4, 'other', 'test', 'student', 0, 0)"),
    db.prepare("INSERT INTO schools (id, name, code, created_at, updated_at) VALUES (1, 'School', 'S', 0, 0)"),
    db.prepare("INSERT INTO academic_sessions (id, school_id, year, name, created_at, updated_at) VALUES (1, 1, 2026, 'Session', 0, 0)"),
    db.prepare("INSERT INTO classes (id, school_id, academic_session_id, teacher_id, name, created_at, updated_at) VALUES (1, 1, 1, 2, 'Class', 0, 0)"),
    db.prepare("INSERT INTO training_schedules (id, teacher_id, class_id, title, training_date, due_date, status, created_at, updated_at) VALUES (1, 2, 1, 'Belum', '2026-11-04', '2026-11-04', 'published', 0, 0), (2, 2, 1, 'Siap', '2026-11-04', '2026-11-04', 'published', 0, 0), (3, 2, 1, 'Esok', '2026-11-05', '2026-11-05', 'published', 0, 0), (4, 2, 1, 'Murid lain', '2026-11-04', '2026-11-04', 'published', 0, 0), (5, 2, 1, 'Arkib', '2026-11-04', '2026-11-04', 'archived', 0, 0), (6, 2, 1, 'Diluluskan', '2026-11-04', '2026-11-04', 'published', 0, 0), (7, 2, 1, 'Perlu dibetulkan', '2026-11-04', '2026-11-04', 'published', 0, 0)"),
    db.prepare("INSERT INTO training_assignments (id, schedule_id, student_id, status, created_at, updated_at) VALUES (1, 1, 3, 'not_started', 0, 0), (2, 2, 3, 'submitted', 0, 0), (3, 3, 3, 'not_started', 0, 0), (4, 4, 4, 'not_started', 0, 0), (5, 5, 3, 'not_started', 0, 0), (6, 6, 3, 'approved', 0, 0), (7, 7, 3, 'needs_correction', 0, 0)"),
  ])
})

afterAll(async () => { await mf.dispose() })

describe('student reminders', () => {
  it('filters by student, date, published schedule and incomplete status using D1', async () => {
    const repo = new TrainingRepository(db)
    expect(await repo.getPendingAssignmentsForStudentOnDate(student.id, '2026-11-04', 6)).toEqual([
      { assignmentId: 1, title: 'Belum' },
      { assignmentId: 7, title: 'Perlu dibetulkan' },
    ])
    expect(await repo.getPendingAssignmentsForStudentOnDate(student.id, '2026-11-06', 6)).toEqual([])
    await db.prepare("UPDATE training_assignments SET status = 'submitted' WHERE id = 1").run()
    expect(await repo.getPendingAssignmentsForStudentOnDate(student.id, '2026-11-04', 6)).toEqual([
      { assignmentId: 7, title: 'Perlu dibetulkan' },
    ])
  })

  it('uses Malaysia date at midnight and limits reminders', async () => {
    const repo = new TrainingRepository(db)
    const getPending = vi.spyOn(repo, 'getPendingAssignmentsForStudentOnDate').mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => ({ assignmentId: index + 1, title: `Latihan ${index + 1}` })),
    )
    const service = new TrainingService(repo, new ClassRepository(db), new AuditRepository(db))
    const result = await service.getTodayRemindersForStudent(student, new Date('2026-11-03T16:00:00Z'))
    expect(getPending).toHaveBeenCalledWith(student.id, '2026-11-04', 6)
    expect(result).toMatchObject({ date: '2026-11-04', hasMore: true })
    expect(result.reminders).toHaveLength(5)
    await service.getTodayRemindersForStudent(student, new Date('2026-11-03T15:59:59Z'))
    expect(getPending).toHaveBeenLastCalledWith(student.id, '2026-11-03', 6)
  })

  it('requires authentication and the student role', async () => {
    const env: Cloudflare.Env = { DB: db, APP_NAME: 'sistem-ujian-segak', CORS_ORIGIN: 'http://localhost:5173', DEEPSEEK_MODEL: 'deepseek-flash', JWT_SECRET: 'test-secret', DEEPSEEK_API_KEY: '' }
    expect((await app.request('http://localhost/api/student/today-reminders', {}, env)).status).toBe(401)
    const authenticate = vi.spyOn(AuthService.prototype, 'authenticate').mockResolvedValue({ user: teacher, jti: 'test' })
    expect((await app.request('http://localhost/api/student/today-reminders', { headers: { Authorization: 'Bearer test' } }, env)).status).toBe(403)
    authenticate.mockResolvedValue({ user: student, jti: 'test' })
    const response = await app.request('http://localhost/api/student/today-reminders', { headers: { Authorization: 'Bearer test' } }, env)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ data: { reminders: expect.any(Array), hasMore: false } })
    authenticate.mockRestore()
  })
})
