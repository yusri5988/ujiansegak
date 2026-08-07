import { Context } from 'hono'
import type { AppEnv } from '@/app/Env'
import { trainingRepoFrom, classRepoFrom, auditRepoFrom } from '@/app/Services/AppServiceProvider'

export class TrainingController {
  public static async getTemplates(c: Context<AppEnv>) {
    const user = c.get('user')!
    const trainingRepo = trainingRepoFrom(c.env)
    const templates = await trainingRepo.getTemplatesByTeacher(user.id)
    return c.json({ success: true, data: templates })
  }

  public static async createTemplate(c: Context<AppEnv>) {
    const user = c.get('user')!
    const body = await c.req.json()
    const trainingRepo = trainingRepoFrom(c.env)

    const template = await trainingRepo.createTemplate({
      teacherId: user.id,
      ...body,
    })

    return c.json({ success: true, data: template })
  }

  public static async getTeacherSchedules(c: Context<AppEnv>) {
    const user = c.get('user')!
    const trainingRepo = trainingRepoFrom(c.env)
    const schedules = await trainingRepo.getSchedulesByTeacher(user.id)
    return c.json({ success: true, data: schedules })
  }

  public static async createSchedule(c: Context<AppEnv>) {
    const user = c.get('user')!
    const { classId, title, trainingDate, instructions, evidenceRequired, teacherNotes, activities } = await c.req.json()

    const trainingRepo = trainingRepoFrom(c.env)
    const classRepo = classRepoFrom(c.env)
    const auditRepo = auditRepoFrom(c.env)

    const schedule = await trainingRepo.createSchedule({
      teacherId: user.id,
      classId,
      title,
      trainingDate,
      // Latihan ditetapkan untuk satu tarikh sahaja; due_date dikekalkan untuk keserasian schema lama.
      dueDate: trainingDate,
      instructions,
      evidenceRequired,
      teacherNotes,
      status: 'published',
    })

    if (!schedule) throw new Error('Gagal mencipta jadual latihan')

    if (activities && Array.isArray(activities)) {
      let idx = 0
      for (const act of activities) {
        await trainingRepo.addScheduleActivity({
          scheduleId: schedule.id,
          templateId: act.templateId,
          title: act.title,
          sets: act.sets,
          reps: act.reps,
          videoUrl: act.videoUrl,
          orderIndex: idx++,
        })
      }
    }

    const classStudents = await classRepo.getClassStudents(classId)
    for (const student of classStudents) {
      await trainingRepo.createAssignment(schedule.id, student.studentUserId)
    }

    await auditRepo.log({
      userId: user.id,
      action: 'CREATE_TRAINING_SCHEDULE',
      entityType: 'TRAINING_SCHEDULE',
      entityId: String(schedule.id),
      details: `Jadual Latihan "${title}" diterbitkan.`,
    })

    return c.json({ success: true, data: schedule })
  }

  public static async getStudentAssignments(c: Context<AppEnv>) {
    const user = c.get('user')!
    const trainingRepo = trainingRepoFrom(c.env)
    const assignments = await trainingRepo.getAssignmentsForStudent(user.id)
    return c.json({ success: true, data: assignments })
  }

  public static async submitTraining(c: Context<AppEnv>) {
    const user = c.get('user')!
    const { assignmentId, scheduleId, durationMinutes, setsCompleted, repsCompleted, studentNotes } = await c.req.json()

    const trainingRepo = trainingRepoFrom(c.env)
    const submission = await trainingRepo.submitTraining({
      assignmentId,
      scheduleId,
      studentId: user.id,
      submissionDate: new Date().toISOString(),
      durationMinutes,
      setsCompleted,
      repsCompleted,
      studentNotes,
      reviewStatus: 'submitted',
    })

    return c.json({ success: true, data: submission })
  }

  public static async getSubmissionsForTeacher(c: Context<AppEnv>) {
    const user = c.get('user')!
    const trainingRepo = trainingRepoFrom(c.env)
    const submissions = await trainingRepo.getSubmissionsForTeacher(user.id)
    return c.json({ success: true, data: submissions })
  }

  public static async reviewSubmission(c: Context<AppEnv>) {
    const user = c.get('user')!
    const { submissionId, reviewStatus, teacherFeedback } = await c.req.json()
    const trainingRepo = trainingRepoFrom(c.env)

    const updated = await trainingRepo.updateSubmissionReview(
      submissionId,
      reviewStatus,
      teacherFeedback || '',
      user.id
    )

    return c.json({ success: true, data: updated })
  }

  // Rekod Latihan Harian Murid (5 Aktiviti SEGAK)
  public static async submitDailyLog(c: Context<AppEnv>) {
    const user = c.get('user')!
    const { logDate, warmupCompleted, curlUpReps, cardioDurationMinutes, cardioPulseOrReps, pushUpReps, sitReachCm, notes } = await c.req.json()

    const trainingRepo = trainingRepoFrom(c.env)
    const auditRepo = auditRepoFrom(c.env)

    const todayStr = logDate || new Date().toISOString().split('T')[0]
    const log = await trainingRepo.saveDailyActivityLog({
      studentId: user.id,
      logDate: todayStr,
      warmupCompleted: warmupCompleted ?? true,
      curlUpReps: curlUpReps || 0,
      cardioDurationMinutes: cardioDurationMinutes || 3,
      cardioPulseOrReps: cardioPulseOrReps || 0,
      pushUpReps: pushUpReps || 0,
      sitReachCm: sitReachCm || 0,
      notes,
    })

    if (!log) throw new Error('Gagal menyimpan log harian')

    await auditRepo.log({
      userId: user.id,
      action: 'SUBMIT_DAILY_LOG',
      entityType: 'DAILY_LOG',
      entityId: String(log.id),
      details: `Murid ID ${user.id} menghantar rekod 5 aktiviti harian bagi tarikh ${todayStr}.`,
    })

    return c.json({ success: true, data: log })
  }

  public static async getStudentDailyLogs(c: Context<AppEnv>) {
    const user = c.get('user')!
    const trainingRepo = trainingRepoFrom(c.env)
    const logs = await trainingRepo.getDailyActivityLogsForStudent(user.id)
    return c.json({ success: true, data: logs })
  }

  public static async getTeacherDailyLogs(c: Context<AppEnv>) {
    const user = c.get('user')!
    const classId = Number(c.req.param('classId'))
    const logDate = c.req.query('date') ?? new Date().toISOString().slice(0, 10)
    const classRepo = classRepoFrom(c.env)
    const trainingRepo = trainingRepoFrom(c.env)
    const selectedClass = await classRepo.findById(classId)

    if (!selectedClass) return c.json({ success: false, message: 'Kelas tidak dijumpai.' }, 404)
    if (user.role === 'teacher' && selectedClass.teacherId !== user.id) {
      return c.json({ success: false, message: 'Anda tidak mempunyai akses ke kelas ini.' }, 403)
    }

    const rows = await trainingRepo.getDailyActivityLogsForClass(classId, logDate)
    const latestByStudent = new Map<number, (typeof rows)[number]>()
    for (const row of rows) {
      if (!latestByStudent.has(row.studentUserId)) latestByStudent.set(row.studentUserId, row)
    }

    const data = Array.from(latestByStudent.values()).map((row) => ({
      studentUserId: row.studentUserId,
      studentIdNum: row.studentIdNum,
      fullName: row.fullName,
      gender: row.gender,
      status: row.logId ? 'completed' : 'not_completed',
      log: row.logId
        ? {
            id: row.logId,
            logDate: row.logDate,
            warmupCompleted: row.warmupCompleted,
            curlUpReps: row.curlUpReps,
            cardioDurationMinutes: row.cardioDurationMinutes,
            cardioPulseOrReps: row.cardioPulseOrReps,
            pushUpReps: row.pushUpReps,
            sitReachCm: row.sitReachCm,
            notes: row.notes,
            createdAt: row.createdAt,
          }
        : null,
    }))

    return c.json({
      success: true,
      data: {
        class: { id: selectedClass.id, name: selectedClass.name },
        date: logDate,
        summary: {
          total: data.length,
          completed: data.filter((student) => student.status === 'completed').length,
          notCompleted: data.filter((student) => student.status === 'not_completed').length,
        },
        students: data,
      },
    })
  }
}
