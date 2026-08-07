import { eq, and, desc } from 'drizzle-orm'
import { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/database/schema'

export class TrainingRepository {
  private db

  constructor(d1: D1Database) {
    this.db = drizzle(d1, { schema })
  }

  // Templat Latihan
  public async getTemplatesByTeacher(teacherId: number) {
    return await this.db
      .select()
      .from(schema.trainingTemplates)
      .where(eq(schema.trainingTemplates.teacherId, teacherId))
  }

  public async createTemplate(data: typeof schema.trainingTemplates.$inferInsert) {
    const inserted = await this.db.insert(schema.trainingTemplates).values(data).returning()
    return inserted[0]
  }

  // Jadual Latihan
  public async getSchedulesByTeacher(teacherId: number) {
    return await this.db
      .select()
      .from(schema.trainingSchedules)
      .where(eq(schema.trainingSchedules.teacherId, teacherId))
  }

  public async getSchedulesByClass(classId: number) {
    return await this.db
      .select()
      .from(schema.trainingSchedules)
      .where(and(eq(schema.trainingSchedules.classId, classId), eq(schema.trainingSchedules.status, 'published')))
  }

  public async createSchedule(data: typeof schema.trainingSchedules.$inferInsert) {
    const inserted = await this.db.insert(schema.trainingSchedules).values(data).returning()
    return inserted[0]
  }

  public async addScheduleActivity(data: typeof schema.trainingScheduleActivities.$inferInsert) {
    const inserted = await this.db.insert(schema.trainingScheduleActivities).values(data).returning()
    return inserted[0]
  }

  // Tugasan & Penghantaran
  public async createAssignment(scheduleId: number, studentId: number) {
    const inserted = await this.db
      .insert(schema.trainingAssignments)
      .values({ scheduleId, studentId, status: 'not_started' })
      .returning()
    return inserted[0]
  }

  public async getAssignmentsForStudent(studentId: number) {
    const assignments = await this.db
      .select({
        assignmentId: schema.trainingAssignments.id,
        status: schema.trainingAssignments.status,
        scheduleId: schema.trainingSchedules.id,
        title: schema.trainingSchedules.title,
        trainingDate: schema.trainingSchedules.trainingDate,
        dueDate: schema.trainingSchedules.dueDate,
        instructions: schema.trainingSchedules.instructions,
        evidenceRequired: schema.trainingSchedules.evidenceRequired,
      })
      .from(schema.trainingAssignments)
      .innerJoin(schema.trainingSchedules, eq(schema.trainingAssignments.scheduleId, schema.trainingSchedules.id))
      .where(eq(schema.trainingAssignments.studentId, studentId))

    return await Promise.all(assignments.map(async (assignment) => ({
      ...assignment,
      activities: await this.getScheduleActivities(assignment.scheduleId),
    })))
  }

  public async getScheduleActivities(scheduleId: number) {
    return await this.db
      .select()
      .from(schema.trainingScheduleActivities)
      .where(eq(schema.trainingScheduleActivities.scheduleId, scheduleId))
  }

  public async submitTraining(data: typeof schema.trainingSubmissions.$inferInsert) {
    const inserted = await this.db.insert(schema.trainingSubmissions).values(data).returning()
    await this.db
      .update(schema.trainingAssignments)
      .set({ status: 'submitted', updatedAt: new Date() })
      .where(eq(schema.trainingAssignments.id, data.assignmentId))
    return inserted[0]
  }

  public async getSubmissionsForTeacher(teacherId: number) {
    return await this.db
      .select({
        submissionId: schema.trainingSubmissions.id,
        submissionDate: schema.trainingSubmissions.submissionDate,
        reviewStatus: schema.trainingSubmissions.reviewStatus,
        durationMinutes: schema.trainingSubmissions.durationMinutes,
        studentNotes: schema.trainingSubmissions.studentNotes,
        studentName: schema.studentProfiles.fullName,
        scheduleTitle: schema.trainingSchedules.title,
      })
      .from(schema.trainingSubmissions)
      .innerJoin(schema.trainingSchedules, eq(schema.trainingSubmissions.scheduleId, schema.trainingSchedules.id))
      .innerJoin(schema.users, eq(schema.trainingSubmissions.studentId, schema.users.id))
      .innerJoin(schema.studentProfiles, eq(schema.users.id, schema.studentProfiles.userId))
      .where(eq(schema.trainingSchedules.teacherId, teacherId))
  }

  public async updateSubmissionReview(
    submissionId: number,
    reviewStatus: 'approved' | 'needs_correction' | 'rejected',
    teacherFeedback: string,
    reviewedBy: number
  ) {
    const updated = await this.db
      .update(schema.trainingSubmissions)
      .set({
        reviewStatus,
        teacherFeedback,
        reviewedBy,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date(),
      })
      .where(eq(schema.trainingSubmissions.id, submissionId))
      .returning()

    if (updated[0]) {
      const assignmentStatus = reviewStatus === 'approved' ? 'approved' : reviewStatus === 'needs_correction' ? 'needs_correction' : 'rejected'
      await this.db
        .update(schema.trainingAssignments)
        .set({ status: assignmentStatus, updatedAt: new Date() })
        .where(eq(schema.trainingAssignments.id, updated[0].assignmentId))
    }

    return updated[0]
  }

  // Rekod Latihan Harian Murid (5 Aktiviti SEGAK)
  public async saveDailyActivityLog(data: typeof schema.dailyActivityLogs.$inferInsert) {
    const inserted = await this.db.insert(schema.dailyActivityLogs).values(data).returning()
    return inserted[0]
  }

  public async getDailyActivityLogsForStudent(studentId: number, limit = 30) {
    return await this.db
      .select()
      .from(schema.dailyActivityLogs)
      .where(eq(schema.dailyActivityLogs.studentId, studentId))
      .orderBy(desc(schema.dailyActivityLogs.logDate))
      .limit(limit)
  }

  public async getDailyActivityLogsForClass(classId: number, logDate: string) {
    return await this.db
      .select({
        studentUserId: schema.users.id,
        studentIdNum: schema.studentProfiles.studentIdNum,
        fullName: schema.studentProfiles.fullName,
        gender: schema.studentProfiles.gender,
        logId: schema.dailyActivityLogs.id,
        logDate: schema.dailyActivityLogs.logDate,
        warmupCompleted: schema.dailyActivityLogs.warmupCompleted,
        curlUpReps: schema.dailyActivityLogs.curlUpReps,
        cardioDurationMinutes: schema.dailyActivityLogs.cardioDurationMinutes,
        cardioPulseOrReps: schema.dailyActivityLogs.cardioPulseOrReps,
        pushUpReps: schema.dailyActivityLogs.pushUpReps,
        sitReachCm: schema.dailyActivityLogs.sitReachCm,
        notes: schema.dailyActivityLogs.notes,
        createdAt: schema.dailyActivityLogs.createdAt,
      })
      .from(schema.classStudents)
      .innerJoin(schema.users, eq(schema.classStudents.studentId, schema.users.id))
      .innerJoin(schema.studentProfiles, eq(schema.users.id, schema.studentProfiles.userId))
      .leftJoin(
        schema.dailyActivityLogs,
        and(
          eq(schema.dailyActivityLogs.studentId, schema.classStudents.studentId),
          eq(schema.dailyActivityLogs.logDate, logDate)
        )
      )
      .where(and(eq(schema.classStudents.classId, classId), eq(schema.classStudents.status, 'active')))
      .orderBy(desc(schema.dailyActivityLogs.createdAt))
  }
}
