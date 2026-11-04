import { readFile } from 'node:fs/promises'
import { Miniflare } from 'miniflare'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import app from '@/app/app'
import { AuthService } from '@/app/Services/AuthService'
import { AiToolService } from '@/app/Services/AiToolService'
import {
  aiChatRepoFrom, aiChatServiceFrom, classRepoFrom, trainingServiceFrom,
  userRepoFrom, segakRepoFrom, teacherSchoolServiceFrom, segakServiceFrom,
} from '@/app/Services/AppServiceProvider'

const teacher = { id: 1, username: 'teacher-one', role: 'teacher' } as const
const mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response() } }', d1Databases: ['DB'] })
let db: D1Database
let env: Cloudflare.Env

beforeAll(async () => {
  db = await mf.getD1Database('DB')
  for (const filename of [
    '0000_oval_doctor_spectrum.sql', '0001_past_colossus.sql', '0002_magenta_martin_li.sql',
    '0003_wandering_dorian_gray.sql', '0004_volatile_zzzax.sql', '0005_rainy_violations.sql', '0006_fuzzy_grey_gargoyle.sql',
  ]) {
    const migration = await readFile(`src/database/migrations/${filename}`, 'utf8')
    for (const statement of migration.split('--> statement-breakpoint')) {
      if (statement.trim()) await db.prepare(statement).run()
    }
  }
  await db.batch([
    db.prepare("INSERT INTO schools (id,name,code,created_at,updated_at) VALUES (1,'Sekolah Satu','S1',0,0),(2,'Sekolah Dua','S2',0,0)"),
    db.prepare("INSERT INTO smartfit_app_users (id,username,password_hash,role,status,created_at,updated_at) VALUES (1,'teacher-one','x','teacher','active',0,0),(2,'teacher-two','x','teacher','active',0,0),(3,'M001','x','student','active',0,0),(4,'M002','x','student','active',0,0),(5,'teacher-three','x','teacher','active',0,0)"),
    db.prepare("INSERT INTO teacher_profiles (user_id,school_id,full_name,created_at,updated_at) VALUES (1,1,'Guru Satu',0,0),(2,2,'Guru Dua',0,0),(5,1,'Guru Tiga',0,0)"),
    db.prepare("INSERT INTO student_profiles (user_id,school_id,student_id_num,full_name,gender,dob,created_at,updated_at) VALUES (3,1,'M001','Ali','L','2014-01-01',0,0),(4,2,'M002','Abu','L','2014-01-01',0,0)"),
    db.prepare("INSERT INTO academic_sessions (id,school_id,year,name,is_current,created_at,updated_at) VALUES (1,1,2026,'Sesi Satu',1,0,0),(2,2,2026,'Sesi Dua',1,0,0)"),
    db.prepare("INSERT INTO classes (id,school_id,academic_session_id,teacher_id,name,status,created_at,updated_at) VALUES (1,1,1,1,'5 Cemerlang','active',0,0),(2,2,2,2,'5 Rahsia','active',0,0),(3,1,1,5,'6 Cemerlang','active',0,0)"),
    db.prepare("INSERT INTO class_students (class_id,student_id,status,created_at,updated_at) VALUES (1,3,'active',0,0),(2,4,'active',0,0)"),
    db.prepare("INSERT INTO training_schedules (id,teacher_id,class_id,title,training_date,due_date,status,created_at,updated_at) VALUES (1,5,3,'Latihan Sekolah Satu','2026-06-01','2026-06-01','published',0,0),(2,2,2,'Latihan Sekolah Dua','2026-06-01','2026-06-01','published',0,0)"),
    db.prepare("INSERT INTO assessment_sessions (id,school_id,academic_session_id,class_id,teacher_id,title,assessment_date,phase,status,created_at,updated_at) VALUES (1,1,1,1,1,'SEGAK Satu','2026-06-01','PENGGAL_1','active',0,0),(2,2,2,2,2,'SEGAK Dua','2026-06-01','PENGGAL_1','active',0,0)"),
    db.prepare("INSERT INTO segak_activities (code,name,measurement_type,is_active,created_at,updated_at) VALUES ('PUSH_UP','Tekan Tubi','count',1,0,0)"),
    db.prepare("INSERT INTO segak_scoring_rules (activity_code,gender,age,min_measurement,max_measurement,score,performance_category,created_at,updated_at) VALUES ('PUSH_UP','L',12,0,100,3,'Sederhana',0,0)"),
  ])
  env = { DB: db, APP_NAME: 'sistem-ujian-segak', CORS_ORIGIN: 'http://localhost:5173', DEEPSEEK_MODEL: 'deepseek-flash', JWT_SECRET: 'test-only-secret-at-least-32-bytes', DEEPSEEK_API_KEY: '' }
})

afterAll(async () => { await mf.dispose() })

function toolsForSchool() {
  return new AiToolService(classRepoFrom(env), trainingServiceFrom(env), userRepoFrom(env), segakRepoFrom(env), teacherSchoolServiceFrom(env), segakServiceFrom(env))
}

describe('teacher AI school scope', () => {
  it('lists only the teacher school and rejects another school class', async () => {
    const tools = toolsForSchool()
    const classes = await tools.run(teacher, 'list_my_classes', '{}')
    expect(classes.kind).toBe('read')
    if (classes.kind !== 'read') throw new Error('Expected read result')
    expect(JSON.parse(classes.content)).toEqual([
      expect.objectContaining({ id: 1, name: '5 Cemerlang' }),
      expect.objectContaining({ id: 3, name: '6 Cemerlang' }),
    ])

    const students = await tools.run(teacher, 'list_class_students', JSON.stringify({ classId: 2 }))
    expect(students.kind).toBe('read')
    if (students.kind !== 'read') throw new Error('Expected read result')
    expect(JSON.parse(students.content)).toHaveProperty('error')
    await expect(tools.confirm(teacher, 'update_class', JSON.stringify({ classId: 2, name: 'Tidak dibenarkan' }), crypto.randomUUID(), 1)).rejects.toMatchObject({ status: 404 })
    expect(await db.prepare('SELECT name FROM classes WHERE id = 2').first()).toMatchObject({ name: '5 Rahsia' })
  })

  it('allows school-wide training work while blocking another school', async () => {
    const tools = toolsForSchool()
    const listed = await tools.run(teacher, 'list_my_training_schedules', '{}')
    if (listed.kind !== 'read') throw new Error('Expected read result')
    expect(JSON.parse(listed.content)).toEqual([expect.objectContaining({ id: 1, title: 'Latihan Sekolah Satu' })])
    const denied = await tools.run(teacher, 'archive_training_schedule', JSON.stringify({ scheduleId: 2 }))
    expect(denied.kind).toBe('read')
    if (denied.kind !== 'read') throw new Error('Expected denied result')
    expect(JSON.parse(denied.content)).toHaveProperty('error')
    await tools.confirm(teacher, 'archive_training_schedule', JSON.stringify({ scheduleId: 1 }), crypto.randomUUID(), 1)
    expect(await db.prepare('SELECT status FROM training_schedules WHERE id = 1').first()).toMatchObject({ status: 'archived' })
    expect(await db.prepare('SELECT status FROM training_schedules WHERE id = 2').first()).toMatchObject({ status: 'published' })
  })

  it('runs the chat tool loop with school-scoped D1 data', async () => {
    const response = (message: object) => new Response(JSON.stringify({ choices: [{ message }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ content: null, tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'list_my_classes', arguments: '{}' } }] }))
      .mockResolvedValueOnce(response({ content: null, tool_calls: [{ id: 'call-2', type: 'function', function: { name: 'list_class_students', arguments: '{"classId":1}' } }] }))
      .mockResolvedValueOnce(response({ content: 'Ali ialah murid 5 Cemerlang.' }))
    vi.stubGlobal('fetch', fetchMock)
    try {
      const result = await aiChatServiceFrom({ ...env, DEEPSEEK_API_KEY: 'test-only' }).sendMessage(teacher, 'Senaraikan murid 5 Cemerlang')
      expect(result.reply).toContain('Ali')
      expect(fetchMock).toHaveBeenCalledTimes(3)
      const thirdRequest = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))
      expect(JSON.stringify(thirdRequest.messages)).toContain('Ali')
      expect(JSON.stringify(thirdRequest.messages)).not.toContain('Abu')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('writes a student only after confirmation and never stores the temporary password in chat', async () => {
    const prepared = await toolsForSchool().run(teacher, 'create_student', JSON.stringify({
      classId: 1, studentIdNum: 'M003', fullName: 'Siti', gender: 'P', dob: '2014-02-01',
    }))
    expect(prepared.kind).toBe('pending')
    if (prepared.kind !== 'pending') throw new Error('Expected pending action')
    expect(await db.prepare("SELECT id FROM smartfit_app_users WHERE username = 'M003'").first()).toBeNull()

    const repo = aiChatRepoFrom(env)
    const conversation = await repo.createConversation(teacher.id, 'Pendaftaran')
    if (!conversation) throw new Error('Conversation missing')
    const actionId = crypto.randomUUID()
    await repo.createPendingAction({
      id: actionId, conversationId: conversation.id, teacherId: teacher.id,
      actionType: prepared.action.actionType, payload: JSON.stringify(prepared.action.payload),
      preview: JSON.stringify(prepared.action.preview), status: 'pending',
      expiresAt: new Date(Date.now() + 60_000),
    })
    const result = await aiChatServiceFrom(env).confirmAction(teacher, actionId)
    expect(result).toHaveProperty('sensitiveOutput.value')
    if (!('sensitiveOutput' in result) || !result.sensitiveOutput) throw new Error('Temporary password missing')
    const profile = await db.prepare("SELECT school_id, full_name FROM student_profiles WHERE student_id_num = 'M003'").first()
    expect(profile).toMatchObject({ school_id: 1, full_name: 'Siti' })
    const history = await repo.getMessages(teacher.id, conversation.id)
    expect(JSON.stringify(history)).not.toContain(result.sensitiveOutput.value)
    await expect(aiChatServiceFrom(env).confirmAction(teacher, actionId)).rejects.toMatchObject({ status: 409 })
  })

  it('imports students together and rolls back the entire batch on a duplicate', async () => {
    const tools = toolsForSchool()
    const inputs = [{ studentIdNum: 'M004', fullName: 'Nadia', gender: 'P', dob: '2014-03-01' }, { studentIdNum: 'M005', fullName: 'Amir', gender: 'L', dob: '2014-04-01' }]
    const prepared = await tools.run(teacher, 'import_students', JSON.stringify({ classId: 1, expectedCount: 2, students: inputs }))
    expect(prepared.kind).toBe('pending')
    if (prepared.kind !== 'pending') throw new Error('Expected pending action')
    expect(await db.prepare("SELECT count(*) AS total FROM smartfit_app_users WHERE username IN ('M004','M005')").first()).toMatchObject({ total: 0 })
    const repo = aiChatRepoFrom(env)
    const conversation = await repo.createConversation(teacher.id, 'Import')
    if (!conversation) throw new Error('Conversation missing')
    const actionId = crypto.randomUUID()
    await repo.createPendingAction({ id: actionId, conversationId: conversation.id, teacherId: teacher.id, actionType: 'import_students', payload: JSON.stringify(prepared.action.payload), preview: JSON.stringify(prepared.action.preview), status: 'pending', expiresAt: new Date(Date.now() + 60_000) })
    const result = await aiChatServiceFrom(env).confirmAction(teacher, actionId)
    expect(result).toHaveProperty('sensitiveOutput.value')
    if (!('sensitiveOutput' in result) || !result.sensitiveOutput) throw new Error('Temporary passwords missing')
    expect(JSON.stringify(await repo.getMessages(teacher.id, conversation.id))).not.toContain(result.sensitiveOutput.value)
    expect(await db.prepare("SELECT count(*) AS total FROM smartfit_app_users WHERE username IN ('M004','M005')").first()).toMatchObject({ total: 2 })
    const repository = classRepoFrom(env)
    await expect(repository.createStudentsForSchool(1, 1, [
      { profile: { studentIdNum: 'M006', fullName: 'Baharu', gender: 'L', dob: '2014-01-01' }, passwordHash: 'hash-1' },
      { profile: { studentIdNum: 'M001', fullName: 'Duplikat', gender: 'L', dob: '2014-01-01' }, passwordHash: 'hash-2' },
    ])).rejects.toThrow()
    expect(await db.prepare("SELECT id FROM smartfit_app_users WHERE username = 'M006'").first()).toBeNull()
  })

  it('rejects an AI import when the CSV row count does not match its proposed action', async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: null, tool_calls: [{ id: 'import-1', type: 'function', function: { name: 'import_students', arguments: JSON.stringify({ classId: 1, expectedCount: 1, students: [{ studentIdNum: 'M007', fullName: 'Nur', gender: 'P', dob: '2014-01-01' }] }) } }] } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
    try {
      await expect(aiChatServiceFrom({ ...env, DEEPSEEK_API_KEY: 'test-only' }).sendMessage(teacher, '[SMARTFIT_CSV_ROWS=2] Import data kelas 1')).rejects.toMatchObject({ status: 422 })
      expect(await db.prepare("SELECT id FROM smartfit_app_users WHERE username = 'M007'").first()).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('records SEGAK atomically inside the school and protects finalized results', async () => {
    const service = segakServiceFrom(env)
    const input = { sessionId: 1, studentIdNum: 'M001', heightCm: 140, weightKg: 35, measurements: [{ activityCode: 'PUSH_UP', rawMeasurement: 15 }], status: 'finalized' as const }
    const saved = await service.recordResultForSchool(teacher, 1, input, crypto.randomUUID())
    expect(saved.totalScore).toBe(3)
    expect(await db.prepare('SELECT count(*) AS total FROM assessment_result_items WHERE result_id = ?').bind(saved.resultId).first()).toMatchObject({ total: 2 })
    await expect(service.recordResultForSchool(teacher, 1, input, crypto.randomUUID())).rejects.toMatchObject({ status: 409 })
    await expect(service.recordResultForSchool(teacher, 1, { ...input, sessionId: 2 }, crypto.randomUUID())).rejects.toMatchObject({ status: 404 })
  })

  it('denies the AI route to student and admin roles', async () => {
    const authenticate = vi.spyOn(AuthService.prototype, 'authenticate')
    for (const role of ['student', 'admin'] as const) {
      authenticate.mockResolvedValue({ user: { id: 1, username: 'other', role }, jti: 'test' })
      const response = await app.request('http://localhost/api/ai/conversations', { headers: { Authorization: 'Bearer test' } }, env)
      expect(response.status).toBe(403)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
    }
    authenticate.mockRestore()
  })

  it('hides old school conversations and templates after a teacher changes schools', async () => {
    const repo = aiChatRepoFrom(env)
    const conversation = await repo.createConversation(teacher.id, 'Sekolah lama')
    if (!conversation) throw new Error('Conversation missing')
    const actionId = crypto.randomUUID()
    await repo.createPendingAction({ id: actionId, conversationId: conversation.id, teacherId: teacher.id, actionType: 'create_class', payload: '{"name":"Kelas baharu"}', preview: '{}', status: 'pending', expiresAt: new Date(Date.now() + 60_000) })
    const training = trainingServiceFrom(env)
    await training.createTemplateForSchool(teacher, 1, { title: 'Template Lama', category: 'cardio', difficulty: 'mudah', sets: 1, reps: 1, restSeconds: 10 }, crypto.randomUUID())
    await db.prepare('UPDATE teacher_profiles SET school_id = 2 WHERE user_id = 1').run()
    try {
      expect(await repo.findConversation(teacher.id, conversation.id)).toBeNull()
      expect(await repo.claimPendingAction(teacher.id, actionId, new Date())).toBeNull()
      expect((await training.getTemplatesForSchool(2)).some((row) => row.title === 'Template Lama')).toBe(false)
      expect((await training.getTemplatesForSchool(1)).some((row) => row.title === 'Template Lama')).toBe(true)
    } finally {
      await db.prepare('UPDATE teacher_profiles SET school_id = 1 WHERE user_id = 1').run()
    }
  })

  it('moves a student atomically within the school and blocks transfers to another school', async () => {
    const tools = toolsForSchool()
    const denied = await tools.run(teacher, 'transfer_student', JSON.stringify({ fromClassId: 1, toClassId: 2, studentIdNum: 'M001' }))
    expect(denied.kind).toBe('read')
    await expect(tools.confirm(teacher, 'transfer_student', JSON.stringify({ fromClassId: 1, toClassId: 2, studentIdNum: 'M001' }), crypto.randomUUID(), 1)).rejects.toMatchObject({ status: 404 })
    expect(await db.prepare("SELECT status FROM class_students WHERE class_id = 1 AND student_id = 3").first()).toMatchObject({ status: 'active' })
    const prepared = await tools.run(teacher, 'transfer_student', JSON.stringify({ fromClassId: 1, toClassId: 3, studentIdNum: 'M001' }))
    expect(prepared.kind).toBe('pending')
    await tools.confirm(teacher, 'transfer_student', JSON.stringify({ fromClassId: 1, toClassId: 3, studentIdNum: 'M001' }), crypto.randomUUID(), 1)
    expect(await db.prepare("SELECT status FROM class_students WHERE class_id = 1 AND student_id = 3").first()).toMatchObject({ status: 'transferred' })
    expect(await db.prepare("SELECT status FROM class_students WHERE class_id = 3 AND student_id = 3").first()).toMatchObject({ status: 'active' })
  })

  it('updates only the logged-in teacher profile after a preview', async () => {
    const tools = toolsForSchool()
    const input = { fullName: 'Guru Baharu', phone: '0123456789', email: 'guru-baharu@example.test' }
    expect((await tools.run(teacher, 'update_my_teacher_profile', JSON.stringify(input))).kind).toBe('pending')
    await tools.confirm(teacher, 'update_teacher_profile', JSON.stringify(input), crypto.randomUUID(), 1)
      expect(await db.prepare('SELECT username FROM smartfit_app_users WHERE id = 1').first()).toMatchObject({ username: input.email })
    expect(await db.prepare('SELECT full_name FROM teacher_profiles WHERE user_id = 1').first()).toMatchObject({ full_name: input.fullName })
    expect(await db.prepare('SELECT full_name FROM teacher_profiles WHERE user_id = 2').first()).toMatchObject({ full_name: 'Guru Dua' })
  })
})
