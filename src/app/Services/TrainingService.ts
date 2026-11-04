import type { AuthUser } from '@/app/Env'
import { ConflictException } from '@/app/Exceptions/ConflictException'
import { NotFoundException } from '@/app/Exceptions/NotFoundException'
import { ValidationException } from '@/app/Exceptions/ValidationException'
import type {
  ReorderTrainingScheduleInput,
  SubmitTrainingInput,
  TrainingScheduleInput,
  TrainingTemplateInput,
} from '@/app/Requests/TrainingRequests'
import { AuditRepository } from '@/app/Repositories/AuditRepository'
import { ClassRepository } from '@/app/Repositories/ClassRepository'
import { TrainingRepository } from '@/app/Repositories/TrainingRepository'

type TrainingScheduleRepository = Pick<
  TrainingRepository,
  | 'getSchedulesByTeacher'
  | 'getAssignmentsForStudent'
  | 'reorderScheduleForTeacher'
  | 'createSchedule'
  | 'addScheduleActivity'
  | 'createAssignment'
  | 'findScheduleForTeacher'
  | 'hasSubmissionsForSchedule'
  | 'updateScheduleForTeacher'
  | 'deleteScheduleForTeacher'
  | 'getPendingAssignmentsForStudentOnDate'
  | 'submitTraining'
> & Partial<
  Pick<
    TrainingRepository,
    | 'createScheduleAtomically'
    | 'createScheduleAtomicallyForSchool'
    | 'getTemplatesByTeacher'
    | 'getTemplatesBySchool'
    | 'getSchedulesBySchool'
    | 'createTemplate'
    | 'getSubmissionsForSchool'
    | 'findScheduleForSchool'
    | 'findSubmissionForSchool'
    | 'findTemplateForSchool'
    | 'getDailyActivityLogsForClassInSchool'
    | 'hasSubmissionsForScheduleInSchool'
    | 'updateScheduleForSchool'
    | 'archiveScheduleForSchool'
    | 'reviewSubmissionForSchool'
    | 'updateTemplateForSchool'
    | 'archiveTemplateForSchool'
    | 'archiveScheduleForTeacher'
    | 'getSubmissionsForTeacher'
    | 'findSubmissionForTeacher'
    | 'reviewSubmissionForTeacher'
    | 'createTemplateForTeacher'
    | 'findTemplateForTeacher'
    | 'updateTemplateForTeacher'
    | 'archiveTemplateForTeacher'
  >
>

type TrainingClassRepository = Pick<ClassRepository, 'findByIdForTeacher' | 'getClassStudents'> &
  Partial<Pick<ClassRepository, 'findByIdForSchool' | 'getClassStudentIdsForSchool'>>
type TrainingAuditRepository = Pick<AuditRepository, 'log'>

export class TrainingService {
  constructor(
    private readonly trainingRepo: TrainingScheduleRepository,
    private readonly classRepo: TrainingClassRepository,
    private readonly auditRepo: TrainingAuditRepository,
  ) {}

  public async getTodayRemindersForStudent(user: AuthUser, now = new Date()) {
    const date = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const limit = 5
    const rows = await this.trainingRepo.getPendingAssignmentsForStudentOnDate(user.id, date, limit + 1)
    return {
      date,
      reminders: rows.slice(0, limit).map(({ assignmentId, title }) => ({ assignmentId, title })),
      hasMore: rows.length > limit,
    }
  }

  public async submitTraining(user: AuthUser, input: SubmitTrainingInput) {
    const result = await this.trainingRepo.submitTraining({
      assignmentId: input.assignmentId,
      scheduleId: input.scheduleId,
      studentId: user.id,
      submissionDate: new Date().toISOString(),
      durationMinutes: input.durationMinutes,
      setsCompleted: input.setsCompleted,
      repsCompleted: input.repsCompleted,
      studentNotes: input.studentNotes,
      reviewStatus: 'submitted',
    })

    if (result.kind === 'not_found') throw new NotFoundException('Latihan')
    if (result.kind === 'already_submitted') {
      throw new ConflictException('Latihan ini telah ditandakan selesai.')
    }

    await this.auditRepo.log({
      userId: user.id,
      action: 'SUBMIT_TRAINING',
      entityType: 'TRAINING_SUBMISSION',
      entityId: String(result.submission.id),
      details: `Murid menandakan latihan ID ${input.assignmentId} sebagai selesai.`,
    })
    return result.submission
  }

  public async getSchedulesForTeacher(user: AuthUser) {
    return this.trainingRepo.getSchedulesByTeacher(user.id)
  }

  public async getAssignmentsForStudent(user: AuthUser) {
    return this.trainingRepo.getAssignmentsForStudent(user.id)
  }

  public async reorderSchedule(user: AuthUser, scheduleId: number, input: ReorderTrainingScheduleInput) {
    const result = await this.trainingRepo.reorderScheduleForTeacher(scheduleId, user.id, input.direction)
    if (!result) throw new NotFoundException('Latihan')

    if (result.moved) {
      await this.auditRepo.log({
        userId: user.id,
        action: 'REORDER_TRAINING_SCHEDULE',
        entityType: 'TRAINING_SCHEDULE',
        entityId: String(scheduleId),
        details: `Susunan latihan "${result.schedule.title}" diubah ${input.direction === 'up' ? 'ke atas' : 'ke bawah'} dalam kelas ID ${result.schedule.classId}.`,
      })
    }

    return result.schedule
  }

  public async getSchedulesForSchool(schoolId: number) {
    if (!this.trainingRepo.getSchedulesBySchool) throw new Error('Repositori jadual sekolah belum tersedia.')
    return this.trainingRepo.getSchedulesBySchool(schoolId, 100)
  }

  public async getTemplatesForTeacher(user: AuthUser) {
    if (!this.trainingRepo.getTemplatesByTeacher) throw new Error('Repositori template belum tersedia.')
    return this.trainingRepo.getTemplatesByTeacher(user.id)
  }

  public async getTemplatesForSchool(schoolId: number) {
    if (!this.trainingRepo.getTemplatesBySchool) throw new Error('Repositori template sekolah belum tersedia.')
    return this.trainingRepo.getTemplatesBySchool(schoolId, 100)
  }

  public async getTemplateForSchool(templateId: number, schoolId: number) {
    if (!this.trainingRepo.findTemplateForSchool) throw new Error('Repositori template sekolah belum tersedia.')
    return this.trainingRepo.findTemplateForSchool(templateId, schoolId)
  }

  public async getTemplateForTeacher(user: AuthUser, templateId: number) {
    if (!this.trainingRepo.findTemplateForTeacher) throw new Error('Repositori template belum tersedia.')
    return this.trainingRepo.findTemplateForTeacher(templateId, user.id)
  }

  public async getScheduleForSchool(scheduleId: number, schoolId: number) {
    if (!this.trainingRepo.findScheduleForSchool) throw new Error('Repositori jadual sekolah belum tersedia.')
    return this.trainingRepo.findScheduleForSchool(scheduleId, schoolId)
  }

  public async getSubmissionsForSchool(schoolId: number) {
    if (!this.trainingRepo.getSubmissionsForSchool) throw new Error('Repositori penyerahan sekolah belum tersedia.')
    return this.trainingRepo.getSubmissionsForSchool(schoolId, 100)
  }

  public async getSubmissionForSchool(submissionId: number, schoolId: number) {
    if (!this.trainingRepo.findSubmissionForSchool) throw new Error('Repositori penyerahan sekolah belum tersedia.')
    return this.trainingRepo.findSubmissionForSchool(submissionId, schoolId)
  }

  public async getClassDailyLogsForSchool(classId: number, schoolId: number, logDate: string) {
    if (!this.trainingRepo.getDailyActivityLogsForClassInSchool) {
      throw new Error('Repositori log aktiviti sekolah belum tersedia.')
    }
    return this.trainingRepo.getDailyActivityLogsForClassInSchool(classId, schoolId, logDate, 201)
  }

  public async createTemplateForSchool(
    user: AuthUser,
    schoolId: number,
    input: TrainingTemplateInput,
    requestId: string,
  ) {
    const created = this.trainingRepo.createTemplateForTeacher
      ? await this.trainingRepo.createTemplateForTeacher(user.id, input, requestId)
      : this.trainingRepo.createTemplate
        ? await this.trainingRepo.createTemplate({ ...input, teacherId: user.id, status: 'active' })
        : null
    if (!created) throw new Error('Gagal mencipta template latihan.')
    await this.auditRepo.log({
      userId: user.id,
      action: 'CREATE_TRAINING_TEMPLATE',
      entityType: 'TRAINING_TEMPLATE',
      entityId: String(created.id),
      details: `Template latihan "${created.title}" dicipta dalam sekolah ID ${schoolId}.`,
    })
    return created
  }

  public async updateTemplateForSchool(
    user: AuthUser,
    schoolId: number,
    templateId: number,
    input: TrainingTemplateInput,
  ) {
    const existing = await this.getTemplateForSchool(templateId, schoolId)
    if (!existing) throw new NotFoundException('Template latihan')
    if (existing.status === 'archived') throw new ConflictException('Template yang telah diarkibkan tidak boleh diubah.')
    if (!this.trainingRepo.updateTemplateForSchool) throw new Error('Repositori template sekolah belum tersedia.')
    const updated = await this.trainingRepo.updateTemplateForSchool(templateId, schoolId, input)
    if (!updated) throw new NotFoundException('Template latihan')
    await this.auditRepo.log({
      userId: user.id,
      action: 'UPDATE_TRAINING_TEMPLATE',
      entityType: 'TRAINING_TEMPLATE',
      entityId: String(templateId),
      details: `Template latihan "${updated.title}" dikemas kini dalam sekolah ID ${schoolId}.`,
    })
    return updated
  }

  public async archiveTemplateForSchool(user: AuthUser, schoolId: number, templateId: number) {
    const existing = await this.getTemplateForSchool(templateId, schoolId)
    if (!existing) throw new NotFoundException('Template latihan')
    if (!this.trainingRepo.archiveTemplateForSchool) throw new Error('Repositori template sekolah belum tersedia.')
    const archived = await this.trainingRepo.archiveTemplateForSchool(templateId, schoolId)
    if (!archived) throw new NotFoundException('Template latihan')
    await this.auditRepo.log({
      userId: user.id,
      action: 'ARCHIVE_TRAINING_TEMPLATE',
      entityType: 'TRAINING_TEMPLATE',
      entityId: String(templateId),
      details: `Template latihan "${archived.title}" diarkibkan dalam sekolah ID ${schoolId}.`,
    })
    return archived
  }

  public async createScheduleForSchool(
    user: AuthUser,
    schoolId: number,
    input: TrainingScheduleInput,
    requestId: string,
  ) {
    const findClass = this.classRepo.findByIdForSchool
    if (!findClass) throw new Error('Repositori kelas sekolah belum tersedia.')
    const targetClass = await findClass.call(this.classRepo, input.classId, schoolId)
    if (!targetClass || targetClass.status !== 'active') throw new NotFoundException('Kelas')
    if (!this.trainingRepo.createScheduleAtomicallyForSchool) {
      throw new Error('Repositori jadual sekolah belum tersedia.')
    }

    const schedule = await this.trainingRepo.createScheduleAtomicallyForSchool(
      {
        teacherId: user.id,
        classId: input.classId,
        title: input.title,
        trainingDate: input.trainingDate,
        dueDate: input.trainingDate,
        instructions: input.instructions || null,
        evidenceRequired: input.evidenceRequired,
        teacherNotes: input.teacherNotes || null,
        status: 'published',
      },
      input.activities,
      requestId,
      schoolId,
    )
    if (!schedule) throw new NotFoundException('Kelas')
    await this.auditRepo.log({
      userId: user.id,
      action: 'CREATE_TRAINING_SCHEDULE',
      entityType: 'TRAINING_SCHEDULE',
      entityId: String(schedule.id),
      details: `Jadual latihan "${input.title}" dicipta dalam sekolah ID ${schoolId}.`,
    })
    return schedule
  }

  public async updateScheduleForSchool(
    user: AuthUser,
    schoolId: number,
    scheduleId: number,
    input: TrainingScheduleInput,
  ) {
    const existing = await this.getScheduleForSchool(scheduleId, schoolId)
    if (!existing) throw new NotFoundException('Latihan')
    if (existing.status === 'archived') throw new ConflictException('Jadual yang telah diarkibkan tidak boleh diubah.')
    if (!this.trainingRepo.hasSubmissionsForScheduleInSchool || !this.trainingRepo.updateScheduleForSchool) {
      throw new Error('Repositori jadual sekolah belum tersedia.')
    }
    if (await this.trainingRepo.hasSubmissionsForScheduleInSchool(scheduleId, schoolId)) {
      throw new ConflictException('Latihan yang sudah mempunyai penghantaran murid tidak boleh diubah.')
    }
    if (!this.classRepo.findByIdForSchool) throw new Error('Repositori kelas sekolah belum tersedia.')
    const targetClass = await this.classRepo.findByIdForSchool(input.classId, schoolId)
    if (!targetClass || targetClass.status !== 'active') throw new NotFoundException('Kelas')

    const classChanged = existing.classId !== input.classId
    let studentIds: number[] | undefined
    if (classChanged) {
      if (!this.classRepo.getClassStudentIdsForSchool) throw new Error('Repositori senarai murid sekolah belum tersedia.')
      studentIds = await this.classRepo.getClassStudentIdsForSchool(input.classId, schoolId)
    }

    const updated = await this.trainingRepo.updateScheduleForSchool(
      scheduleId,
      schoolId,
      {
        classId: input.classId,
        title: input.title,
        trainingDate: input.trainingDate,
        dueDate: input.trainingDate,
        instructions: input.instructions || null,
        evidenceRequired: input.evidenceRequired,
        teacherNotes: input.teacherNotes || null,
      },
      input.activities,
      studentIds,
    )
    if (!updated) throw new NotFoundException('Latihan')
    await this.auditRepo.log({
      userId: user.id,
      action: 'UPDATE_TRAINING_SCHEDULE',
      entityType: 'TRAINING_SCHEDULE',
      entityId: String(scheduleId),
      details: `Jadual latihan "${input.title}" dikemas kini dalam sekolah ID ${schoolId}.`,
    })
    return updated
  }

  public async archiveScheduleForSchool(user: AuthUser, schoolId: number, scheduleId: number) {
    const schedule = await this.getScheduleForSchool(scheduleId, schoolId)
    if (!schedule) throw new NotFoundException('Latihan')
    if (!this.trainingRepo.archiveScheduleForSchool) throw new Error('Repositori arkib sekolah belum tersedia.')
    const archived = await this.trainingRepo.archiveScheduleForSchool(scheduleId, schoolId)
    if (!archived) throw new NotFoundException('Latihan')
    await this.auditRepo.log({
      userId: user.id,
      action: 'ARCHIVE_TRAINING_SCHEDULE',
      entityType: 'TRAINING_SCHEDULE',
      entityId: String(scheduleId),
      details: `Jadual latihan "${schedule.title}" diarkibkan dalam sekolah ID ${schoolId}.`,
    })
    return archived
  }

  public async reviewSubmissionForSchool(
    user: AuthUser,
    schoolId: number,
    input: { submissionId: number; reviewStatus: 'approved' | 'needs_correction' | 'rejected'; teacherFeedback?: string },
  ) {
    const submission = await this.getSubmissionForSchool(input.submissionId, schoolId)
    if (!submission) throw new NotFoundException('Penghantaran')
    if (!this.trainingRepo.reviewSubmissionForSchool) throw new Error('Repositori semakan sekolah belum tersedia.')
    const updated = await this.trainingRepo.reviewSubmissionForSchool(
      input.submissionId,
      schoolId,
      input.reviewStatus,
      input.teacherFeedback ?? '',
      user.id,
    )
    if (!updated) throw new NotFoundException('Penghantaran')
    await this.auditRepo.log({
      userId: user.id,
      action: 'REVIEW_TRAINING_SUBMISSION',
      entityType: 'TRAINING_SUBMISSION',
      entityId: String(input.submissionId),
      details: `Penghantaran latihan disemak dengan status ${input.reviewStatus} dalam sekolah ID ${schoolId}.`,
    })
    return updated
  }

  public async createTemplate(user: AuthUser, input: TrainingTemplateInput, requestId = crypto.randomUUID()) {
    const created = this.trainingRepo.createTemplateForTeacher
      ? await this.trainingRepo.createTemplateForTeacher(user.id, input, requestId)
      : this.trainingRepo.createTemplate
        ? await this.trainingRepo.createTemplate({ ...input, teacherId: user.id, status: 'active' })
        : null
    if (!created) throw new Error('Gagal mencipta template latihan.')

    await this.auditRepo.log({
      userId: user.id,
      action: 'CREATE_TRAINING_TEMPLATE',
      entityType: 'TRAINING_TEMPLATE',
      entityId: String(created.id),
      details: `Template latihan "${created.title}" dicipta.`,
    })
    return created
  }

  public async updateTemplate(user: AuthUser, templateId: number, input: TrainingTemplateInput) {
    const existing = await this.getTemplateForTeacher(user, templateId)
    if (!existing) throw new NotFoundException('Template latihan')
    if (existing.status === 'archived') throw new ConflictException('Template yang telah diarkibkan tidak boleh diubah.')
    if (!this.trainingRepo.updateTemplateForTeacher) throw new Error('Repositori template belum tersedia.')

    const updated = await this.trainingRepo.updateTemplateForTeacher(templateId, user.id, input)
    if (!updated) throw new NotFoundException('Template latihan')
    await this.auditRepo.log({
      userId: user.id,
      action: 'UPDATE_TRAINING_TEMPLATE',
      entityType: 'TRAINING_TEMPLATE',
      entityId: String(templateId),
      details: `Template latihan "${updated.title}" dikemas kini.`,
    })
    return updated
  }

  public async archiveTemplate(user: AuthUser, templateId: number) {
    const existing = await this.getTemplateForTeacher(user, templateId)
    if (!existing) throw new NotFoundException('Template latihan')
    if (!this.trainingRepo.archiveTemplateForTeacher) throw new Error('Repositori template belum tersedia.')

    const archived = await this.trainingRepo.archiveTemplateForTeacher(templateId, user.id)
    if (!archived) throw new NotFoundException('Template latihan')
    await this.auditRepo.log({
      userId: user.id,
      action: 'ARCHIVE_TRAINING_TEMPLATE',
      entityType: 'TRAINING_TEMPLATE',
      entityId: String(templateId),
      details: `Template latihan "${archived.title}" diarkibkan.`,
    })
    return archived
  }

  public async getScheduleForTeacher(user: AuthUser, scheduleId: number) {
    return this.trainingRepo.findScheduleForTeacher(scheduleId, user.id)
  }

  public async getSubmissionsForTeacher(user: AuthUser) {
    if (!this.trainingRepo.getSubmissionsForTeacher) throw new Error('Repositori penghantaran belum tersedia.')
    return this.trainingRepo.getSubmissionsForTeacher(user.id, 50)
  }

  public async getSubmissionForTeacher(user: AuthUser, submissionId: number) {
    if (!this.trainingRepo.findSubmissionForTeacher) throw new Error('Repositori penghantaran belum tersedia.')
    return this.trainingRepo.findSubmissionForTeacher(submissionId, user.id)
  }

  public async createSchedule(user: AuthUser, input: TrainingScheduleInput, requestId = crypto.randomUUID()) {
    const targetClass = await this.classRepo.findByIdForTeacher(input.classId, user.id)
    if (!targetClass) throw new NotFoundException('Kelas')
    if (targetClass.status !== 'active') {
      throw new ValidationException({ classId: ['Pilih kelas yang masih aktif.'] })
    }

    const creationRequestId = requestId
    const scheduleData = {
      teacherId: user.id,
      classId: input.classId,
      title: input.title,
      trainingDate: input.trainingDate,
      dueDate: input.trainingDate,
      instructions: input.instructions || null,
      evidenceRequired: input.evidenceRequired,
      teacherNotes: input.teacherNotes || null,
      status: 'published',
    } as const

    let schedule: Awaited<ReturnType<TrainingRepository['createSchedule']>> | null | undefined
    if (this.trainingRepo.createScheduleAtomically) {
      schedule = await this.trainingRepo.createScheduleAtomically(
        { ...scheduleData, creationRequestId },
        input.activities,
        creationRequestId,
      )
    } else {
      schedule = await this.trainingRepo.createSchedule(scheduleData)
      if (schedule) {
        for (const [orderIndex, activity] of input.activities.entries()) {
          await this.trainingRepo.addScheduleActivity({
            scheduleId: schedule.id,
            templateId: activity.templateId,
            title: activity.title,
            sets: activity.sets,
            reps: activity.reps,
            videoUrl: activity.videoUrl,
            orderIndex,
          })
        }

        const students = await this.classRepo.getClassStudents(input.classId)
        for (const student of students) {
          await this.trainingRepo.createAssignment(schedule.id, student.studentUserId)
        }
      }
    }
    if (!schedule) throw new Error('Gagal mencipta jadual latihan')

    await this.auditRepo.log({
      userId: user.id,
      action: 'CREATE_TRAINING_SCHEDULE',
      entityType: 'TRAINING_SCHEDULE',
      entityId: String(schedule.id),
      details: `Jadual latihan "${input.title}" diterbitkan.`,
    })

    return schedule
  }

  public async updateSchedule(user: AuthUser, scheduleId: number, input: TrainingScheduleInput) {
    const existing = await this.trainingRepo.findScheduleForTeacher(scheduleId, user.id)
    if (!existing) throw new NotFoundException('Latihan')
    if (existing.status === 'archived') throw new ConflictException('Jadual yang telah diarkibkan tidak boleh diubah.')

    if (await this.trainingRepo.hasSubmissionsForSchedule(scheduleId, user.id)) {
      throw new ConflictException('Latihan yang sudah mempunyai penghantaran murid tidak boleh diubah.')
    }

    const targetClass = await this.classRepo.findByIdForTeacher(input.classId, user.id)
    if (!targetClass) throw new NotFoundException('Kelas')
    const classChanged = existing.classId !== input.classId
    if (classChanged && targetClass.status !== 'active') {
      throw new ValidationException({ classId: ['Pilih kelas yang masih aktif.'] })
    }

    const students = classChanged ? await this.classRepo.getClassStudents(input.classId) : undefined
    const updated = await this.trainingRepo.updateScheduleForTeacher(
      scheduleId,
      user.id,
      {
        classId: input.classId,
        title: input.title,
        trainingDate: input.trainingDate,
        dueDate: input.trainingDate,
        instructions: input.instructions || null,
        evidenceRequired: input.evidenceRequired,
        teacherNotes: input.teacherNotes || null,
      },
      input.activities,
      students?.map((student) => student.studentUserId),
    )

    if (!updated) {
      if (await this.trainingRepo.hasSubmissionsForSchedule(scheduleId, user.id)) {
        throw new ConflictException('Latihan yang sudah mempunyai penghantaran murid tidak boleh diubah.')
      }
      throw new NotFoundException('Latihan')
    }

    await this.auditRepo.log({
      userId: user.id,
      action: 'UPDATE_TRAINING_SCHEDULE',
      entityType: 'TRAINING_SCHEDULE',
      entityId: String(scheduleId),
      details: `Jadual latihan "${input.title}" dikemas kini.`,
    })

    return updated
  }

  public async deleteSchedule(user: AuthUser, scheduleId: number) {
    const schedule = await this.trainingRepo.findScheduleForTeacher(scheduleId, user.id)
    if (!schedule) throw new NotFoundException('Latihan')

    if (await this.trainingRepo.hasSubmissionsForSchedule(scheduleId, user.id)) {
      throw new ConflictException('Latihan yang sudah mempunyai penghantaran murid tidak boleh dipadam.')
    }

    const deleted = await this.trainingRepo.deleteScheduleForTeacher(scheduleId, user.id)
    if (!deleted) {
      if (await this.trainingRepo.hasSubmissionsForSchedule(scheduleId, user.id)) {
        throw new ConflictException('Latihan yang sudah mempunyai penghantaran murid tidak boleh dipadam.')
      }
      throw new NotFoundException('Latihan')
    }

    await this.auditRepo.log({
      userId: user.id,
      action: 'DELETE_TRAINING_SCHEDULE',
      entityType: 'TRAINING_SCHEDULE',
      entityId: String(scheduleId),
      details: `Jadual latihan "${schedule.title}" dipadam.`,
    })
  }

  public async archiveSchedule(user: AuthUser, scheduleId: number) {
    const schedule = await this.trainingRepo.findScheduleForTeacher(scheduleId, user.id)
    if (!schedule) throw new NotFoundException('Latihan')
    if (!this.trainingRepo.archiveScheduleForTeacher) throw new Error('Repositori arkib belum tersedia.')

    const archived = await this.trainingRepo.archiveScheduleForTeacher(scheduleId, user.id)
    if (!archived) throw new NotFoundException('Latihan')

    await this.auditRepo.log({
      userId: user.id,
      action: 'ARCHIVE_TRAINING_SCHEDULE',
      entityType: 'TRAINING_SCHEDULE',
      entityId: String(scheduleId),
      details: `Jadual latihan "${schedule.title}" diarkibkan.`,
    })
    return archived
  }

  public async reviewSubmission(
    user: AuthUser,
    input: { submissionId: number; reviewStatus: 'approved' | 'needs_correction' | 'rejected'; teacherFeedback?: string },
  ) {
    if (!this.trainingRepo.findSubmissionForTeacher || !this.trainingRepo.reviewSubmissionForTeacher) {
      throw new Error('Repositori semakan belum tersedia.')
    }
    const submission = await this.trainingRepo.findSubmissionForTeacher(input.submissionId, user.id)
    if (!submission) throw new NotFoundException('Penghantaran')

    const updated = await this.trainingRepo.reviewSubmissionForTeacher(
      input.submissionId,
      user.id,
      input.reviewStatus,
      input.teacherFeedback ?? '',
      user.id,
    )
    if (!updated) throw new NotFoundException('Penghantaran')

    await this.auditRepo.log({
      userId: user.id,
      action: 'REVIEW_TRAINING_SUBMISSION',
      entityType: 'TRAINING_SUBMISSION',
      entityId: String(input.submissionId),
      details: `Penghantaran latihan disemak dengan status ${input.reviewStatus}.`,
    })
    return updated
  }
}
