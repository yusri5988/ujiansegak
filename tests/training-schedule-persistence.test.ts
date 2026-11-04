import { readFile } from 'node:fs/promises'
import { Miniflare } from 'miniflare'
import type { D1Database } from '@cloudflare/workers-types'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import app from '@/app/app'
import type { AuthUser } from '@/app/Env'
import { TrainingRepository } from '@/app/Repositories/TrainingRepository'
import { AuthService } from '@/app/Services/AuthService'

const teacher: AuthUser = { id: 2, username: 'teacher', role: 'teacher' }
const miniflare = new Miniflare({
  modules: true,
  script: 'export default { fetch() { return new Response() } }',
  d1Databases: ['DB'],
})

let db: D1Database
let env: Cloudflare.Env

async function expectAssignmentTimestamps(scheduleId: number) {
  const assignments = await db
    .prepare('SELECT created_at, updated_at FROM training_assignments WHERE schedule_id = ? ORDER BY id')
    .bind(scheduleId)
    .all<{ created_at: number; updated_at: number }>()

  expect(assignments.results).toHaveLength(2)
  expect(assignments.results.every(({ created_at, updated_at }) => created_at > 0 && updated_at > 0)).toBe(true)
}

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
    db.prepare("INSERT INTO class_students (class_id, student_id, status, created_at, updated_at) VALUES (1, 3, 'active', 0, 0), (1, 4, 'active', 0, 0)"),
    db.prepare("INSERT INTO student_profiles (user_id, school_id, student_id_num, full_name, gender, dob, created_at, updated_at) VALUES (3, 1, 'S001', 'Murid Satu', 'L', '2014-01-01', 0, 0), (4, 1, 'S002', 'Murid Dua', 'P', '2014-01-01', 0, 0)"),
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

describe('teacher training schedule persistence', () => {
  it('creates and reassigns teacher and school schedules with required assignment timestamps', async () => {
    const authenticate = vi.spyOn(AuthService.prototype, 'authenticate').mockResolvedValue({
      user: teacher,
      jti: 'test-session',
    })

    try {
      const response = await app.request(
        'http://localhost/api/teacher/schedules',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            classId: 1,
            title: 'Senaman Pemanasan Badan',
            trainingDate: '2026-11-04',
            instructions: 'Mulakan dengan regangan ringan.',
            evidenceRequired: false,
            activities: [{
              title: 'Senaman Pemanasan Badan',
              sets: 1,
              reps: null,
              videoUrl: 'https://youtu.be/nagbnY3Na-U?si=example',
            }],
          }),
        },
        env,
      )

      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        success: true,
        data: {
          title: 'Senaman Pemanasan Badan',
          activities: [{ title: 'Senaman Pemanasan Badan' }],
        },
      })

      const createdTeacherSchedule = await db
        .prepare('SELECT id FROM training_schedules WHERE title = ?')
        .bind('Senaman Pemanasan Badan')
        .first<{ id: number }>()
      if (!createdTeacherSchedule) throw new Error('Jadual guru tidak ditemui selepas diterbitkan.')
      await expectAssignmentTimestamps(createdTeacherSchedule.id)

      const trainingRepo = new TrainingRepository(db)
      const activity = {
        title: 'Senaman Pemanasan Badan',
        sets: 1,
        reps: null,
        videoUrl: 'https://youtu.be/nagbnY3Na-U?si=example',
      }
      const changes = {
        classId: 1,
        title: 'Latihan guru dikemas kini',
        trainingDate: '2026-11-04',
        dueDate: '2026-11-04',
        instructions: null,
        evidenceRequired: false,
        teacherNotes: null,
      }

      const updatedTeacherSchedule = await trainingRepo.updateScheduleForTeacher(
        createdTeacherSchedule.id,
        teacher.id,
        changes,
        [activity],
        [3, 4],
      )
      expect(updatedTeacherSchedule).not.toBeNull()
      await expectAssignmentTimestamps(createdTeacherSchedule.id)

      const createdSchoolSchedule = await trainingRepo.createScheduleAtomicallyForSchool(
        {
          teacherId: teacher.id,
          classId: 1,
          title: 'Latihan sekolah',
          trainingDate: '2026-11-04',
          dueDate: '2026-11-04',
          evidenceRequired: false,
          status: 'published',
        },
        [activity],
        'school-schedule-request-1',
        1,
      )
      if (!createdSchoolSchedule) throw new Error('Jadual sekolah tidak berjaya dicipta.')
      await expectAssignmentTimestamps(createdSchoolSchedule.id)

      const updatedSchoolSchedule = await trainingRepo.updateScheduleForSchool(
        createdSchoolSchedule.id,
        1,
        { ...changes, title: 'Latihan sekolah dikemas kini' },
        [activity],
        [3, 4],
      )
      expect(updatedSchoolSchedule).not.toBeNull()
      await expectAssignmentTimestamps(createdSchoolSchedule.id)
    } finally {
      authenticate.mockRestore()
    }
  })
})
