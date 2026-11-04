import { readFile } from 'node:fs/promises'
import { Miniflare } from 'miniflare'
import type { D1Database } from '@cloudflare/workers-types'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import app from '@/app/app'
import type { AuthUser } from '@/app/Env'
import { AuthService } from '@/app/Services/AuthService'

const student: AuthUser = { id: 3, username: 'student-1', role: 'student' }
const miniflare = new Miniflare({
  modules: true,
  script: 'export default { fetch() { return new Response() } }',
  d1Databases: ['DB'],
})

let db: D1Database
let env: Cloudflare.Env

beforeAll(async () => {
  db = await miniflare.getD1Database('DB')
  for (const filename of [
    '0000_oval_doctor_spectrum.sql',
    '0001_past_colossus.sql',
    '0002_magenta_martin_li.sql',
    '0003_wandering_dorian_gray.sql',
    '0004_volatile_zzzax.sql',
    '0005_rainy_violations.sql',
    '0006_fuzzy_grey_gargoyle.sql',
    '0007_oval_sphinx.sql',
  ]) {
    const migration = await readFile(`src/database/migrations/${filename}`, 'utf8')
    for (const statement of migration.split('--> statement-breakpoint')) {
      if (statement.trim()) await db.prepare(statement).run()
    }
  }

  await db.batch([
    db.prepare("INSERT INTO schools (id, name, code, created_at, updated_at) VALUES (1, 'Sekolah', 'S1', 0, 0)"),
    db.prepare("INSERT INTO smartfit_app_users (id, username, password_hash, role, status, created_at, updated_at) VALUES (2, 'teacher', 'test', 'teacher', 'active', 0, 0), (3, 'student-1', 'test', 'student', 'active', 0, 0), (4, 'student-2', 'test', 'student', 'active', 0, 0)"),
    db.prepare("INSERT INTO academic_sessions (id, school_id, year, name, created_at, updated_at) VALUES (1, 1, 2026, 'Sesi 2026', 0, 0)"),
    db.prepare("INSERT INTO classes (id, school_id, academic_session_id, teacher_id, name, status, created_at, updated_at) VALUES (1, 1, 1, 2, '5 Cemerlang', 'active', 0, 0)"),
    db.prepare("INSERT INTO training_schedules (id, teacher_id, class_id, title, training_date, due_date, status, created_at, updated_at) VALUES (1, 2, 1, 'Latihan SEGAK', '2026-11-05', '2026-11-05', 'published', 0, 0)"),
    db.prepare("INSERT INTO training_assignments (id, schedule_id, student_id, status, created_at, updated_at) VALUES (1, 1, 3, 'not_started', 0, 0), (2, 1, 4, 'not_started', 0, 0)"),
  ])

  env = {
    DB: db,
    APP_NAME: 'sistem-ujian-segak',
    CORS_ORIGIN: 'http://localhost:5173',
    DEEPSEEK_MODEL: 'deepseek-flash',
    JWT_SECRET: 'test-only-secret-at-least-32-bytes',
    DEEPSEEK_API_KEY: '',
  }
})

afterAll(async () => {
  await miniflare.dispose()
})

describe('student training submission', () => {
  it('rejects a second completion for the same assignment', async () => {
    const authenticate = vi.spyOn(AuthService.prototype, 'authenticate').mockResolvedValue({
      user: student,
      jti: 'test-session',
    })

    const submit = () => app.request(
      'http://localhost/api/student/submissions',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignmentId: 1, scheduleId: 1, studentNotes: 'Selesai' }),
      },
      env,
    )

    try {
      const firstResponse = await submit()
      expect(firstResponse.status).toBe(200)
      expect(await firstResponse.json()).toMatchObject({ success: true })

      const duplicateResponse = await submit()
      expect(duplicateResponse.status).toBe(409)
      expect(await duplicateResponse.json()).toMatchObject({
        message: 'Latihan ini telah ditandakan selesai.',
      })

      const submissionCount = await db
        .prepare('SELECT COUNT(*) AS count FROM training_submissions WHERE assignment_id = 1 AND student_id = 3')
        .first<{ count: number }>()
      const assignment = await db
        .prepare('SELECT status FROM training_assignments WHERE id = 1')
        .first<{ status: string }>()

      expect(submissionCount?.count).toBe(1)
      expect(assignment?.status).toBe('submitted')
    } finally {
      authenticate.mockRestore()
    }
  })

  it('does not allow a student to submit another student assignment', async () => {
    const authenticate = vi.spyOn(AuthService.prototype, 'authenticate').mockResolvedValue({
      user: student,
      jti: 'test-session',
    })

    try {
      const response = await app.request(
        'http://localhost/api/student/submissions',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ assignmentId: 2, scheduleId: 1 }),
        },
        env,
      )

      expect(response.status).toBe(404)
      const submissionCount = await db
        .prepare('SELECT COUNT(*) AS count FROM training_submissions WHERE assignment_id = 2')
        .first<{ count: number }>()
      expect(submissionCount?.count).toBe(0)
    } finally {
      authenticate.mockRestore()
    }
  })
})
