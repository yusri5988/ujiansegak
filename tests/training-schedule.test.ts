import { describe, expect, it, vi } from 'vitest'
import app from '@/app/app'
import type { AuthUser } from '@/app/Env'
import { ConflictException } from '@/app/Exceptions/ConflictException'
import { NotFoundException } from '@/app/Exceptions/NotFoundException'
import { createTrainingScheduleSchema } from '@/app/Requests/TrainingRequests'
import { AuditRepository } from '@/app/Repositories/AuditRepository'
import { ClassRepository } from '@/app/Repositories/ClassRepository'
import { TrainingRepository } from '@/app/Repositories/TrainingRepository'
import { TrainingService } from '@/app/Services/TrainingService'
import * as schema from '@/database/schema'

const teacher: AuthUser = { id: 2, username: 'teacher@example.edu', role: 'teacher' }

const existingSchedule = {
  id: 10,
  creationRequestId: null,
  teacherId: teacher.id,
  classId: 1,
  title: 'Latihan SEGAK',
  trainingDate: '2026-11-04',
  dueDate: '2026-11-04',
  instructions: null,
  evidenceRequired: false,
  teacherNotes: null,
  status: 'published',
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
} satisfies typeof schema.trainingSchedules.$inferSelect

function createTrainingService(hasSubmissions: boolean) {
  const deleteScheduleForTeacher = vi.fn(async () => false)
  const trainingRepo: Pick<
    TrainingRepository,
    | 'getSchedulesByTeacher'
    | 'createSchedule'
    | 'addScheduleActivity'
    | 'createAssignment'
    | 'findScheduleForTeacher'
    | 'hasSubmissionsForSchedule'
    | 'updateScheduleForTeacher'
    | 'deleteScheduleForTeacher'
    | 'getPendingAssignmentsForStudentOnDate'
  > = {
    getSchedulesByTeacher: vi.fn(async () => []),
    createSchedule: vi.fn(async () => existingSchedule),
    addScheduleActivity: vi.fn(async () => ({
      id: 1,
      scheduleId: existingSchedule.id,
      templateId: null,
      title: existingSchedule.title,
      sets: 1,
      reps: null,
      videoUrl: null,
      orderIndex: 0,
    })),
    createAssignment: vi.fn(async () => ({
      id: 1,
      scheduleId: existingSchedule.id,
      studentId: 3,
      status: 'not_started' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    findScheduleForTeacher: vi.fn(async () => existingSchedule),
    hasSubmissionsForSchedule: vi.fn(async () => hasSubmissions),
    updateScheduleForTeacher: vi.fn(async () => null),
    deleteScheduleForTeacher,
    getPendingAssignmentsForStudentOnDate: vi.fn(async () => []),
  }

  const classRepo: Pick<ClassRepository, 'findByIdForTeacher' | 'getClassStudents'> = {
    findByIdForTeacher: vi.fn(async () => null),
    getClassStudents: vi.fn(async () => []),
  }

  const auditRepo: Pick<AuditRepository, 'log'> = {
    log: vi.fn(async (entry) => ({
      ...entry,
      id: 1,
      createdAt: new Date(),
    })),
  }

  return {
    service: new TrainingService(trainingRepo, classRepo, auditRepo),
    trainingRepo,
    deleteScheduleForTeacher,
  }
}

describe('training schedule CRUD', () => {
  it('requires exactly one YouTube activity per schedule', () => {
    const base = {
      classId: 1,
      title: 'Latihan SEGAK',
      trainingDate: '2026-11-04',
      evidenceRequired: false,
      activities: [
        { title: 'Aktiviti 1', sets: 1, reps: null, videoUrl: 'https://youtu.be/example01' },
        { title: 'Aktiviti 2', sets: 1, reps: null, videoUrl: 'https://youtu.be/example02' },
      ],
    }

    expect(createTrainingScheduleSchema.safeParse(base).success).toBe(false)
    expect(
      createTrainingScheduleSchema.safeParse({ ...base, activities: [base.activities[0]] }).success,
    ).toBe(true)
  })

  it('does not delete a schedule after students have submitted it', async () => {
    const { service, deleteScheduleForTeacher } = createTrainingService(true)

    await expect(service.deleteSchedule(teacher, existingSchedule.id)).rejects.toBeInstanceOf(ConflictException)
    expect(deleteScheduleForTeacher).not.toHaveBeenCalled()
  })

  it('does not allow updating a schedule outside the teacher scope', async () => {
    const { service, trainingRepo } = createTrainingService(false)
    vi.mocked(trainingRepo.findScheduleForTeacher).mockResolvedValueOnce(null)

    await expect(
      service.updateSchedule(teacher, existingSchedule.id, {
        classId: 1,
        title: 'Latihan baharu',
        trainingDate: '2026-11-05',
        instructions: '',
        evidenceRequired: false,
        activities: [{ title: 'Latihan baharu', sets: 1, reps: null, videoUrl: 'https://youtu.be/example01' }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(trainingRepo.updateScheduleForTeacher).not.toHaveBeenCalled()
  })

  it.each(['PUT', 'DELETE'])('requires authentication for %s /api/teacher/schedules/:id', async (method) => {
    const response = await app.request('http://localhost/api/teacher/schedules/10', {
      method,
      headers: method === 'PUT' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'PUT' ? '{}' : undefined,
    })

    expect(response.status).toBe(401)
  })
})
