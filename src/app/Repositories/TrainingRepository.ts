import { eq, and, desc, asc, inArray, notInArray, sql } from 'drizzle-orm'
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/database/schema'

export type TrainingScheduleChanges = Pick<
  typeof schema.trainingSchedules.$inferInsert,
  'classId' | 'title' | 'trainingDate' | 'dueDate' | 'instructions' | 'evidenceRequired' | 'teacherNotes'
>

export type TrainingScheduleActivityInput = Pick<
  typeof schema.trainingScheduleActivities.$inferInsert,
  'templateId' | 'title' | 'sets' | 'reps' | 'videoUrl'
>

export type TrainingTemplateChanges = Pick<
  typeof schema.trainingTemplates.$inferInsert,
  | 'title'
  | 'description'
  | 'objective'
  | 'category'
  | 'estimatedDuration'
  | 'difficulty'
  | 'sets'
  | 'reps'
  | 'restSeconds'
  | 'videoUrl'
  | 'safetyNotes'
>

export type SubmitTrainingResult =
  | { kind: 'created'; submission: typeof schema.trainingSubmissions.$inferSelect }
  | { kind: 'not_found' }
  | { kind: 'already_submitted' }

export class TrainingRepository {
  private db
  private readonly d1: D1Database

  constructor(d1: D1Database) {
    this.d1 = d1
    this.db = drizzle(d1, { schema })
  }

  // Templat Latihan
  public async getTemplatesByTeacher(teacherId: number, limit = 50) {
    return await this.db
      .select()
      .from(schema.trainingTemplates)
      .where(and(eq(schema.trainingTemplates.teacherId, teacherId), sql`${schema.trainingTemplates.schoolId} = (SELECT school_id FROM teacher_profiles WHERE user_id = ${teacherId} ORDER BY id LIMIT 1)`))
      .orderBy(desc(schema.trainingTemplates.updatedAt), desc(schema.trainingTemplates.id))
      .limit(limit)
  }

  public async getTemplatesBySchool(schoolId: number, limit = 100) {
    return await this.db
      .select()
      .from(schema.trainingTemplates)
      .where(eq(schema.trainingTemplates.schoolId, schoolId))
      .orderBy(desc(schema.trainingTemplates.updatedAt), desc(schema.trainingTemplates.id))
      .limit(limit)
  }

  public async createTemplate(data: typeof schema.trainingTemplates.$inferInsert) {
    const profile = await this.db.select({ schoolId: schema.teacherProfiles.schoolId }).from(schema.teacherProfiles).where(eq(schema.teacherProfiles.userId, data.teacherId)).orderBy(asc(schema.teacherProfiles.id)).limit(1)
    if (!profile[0]) return undefined
    const inserted = await this.db.insert(schema.trainingTemplates).values({ ...data, schoolId: profile[0].schoolId }).returning()
    return inserted[0]
  }

  public async createTemplateForTeacher(
    teacherId: number,
    data: TrainingTemplateChanges,
    creationRequestId: string,
  ) {
    const profile = await this.db.select({ schoolId: schema.teacherProfiles.schoolId }).from(schema.teacherProfiles).where(eq(schema.teacherProfiles.userId, teacherId)).orderBy(asc(schema.teacherProfiles.id)).limit(1)
    if (!profile[0]) return null
    const existing = await this.findTemplateByCreationRequestId(creationRequestId, teacherId)
    if (existing) return existing

    const inserted = await this.db
      .insert(schema.trainingTemplates)
      .values({ ...data, teacherId, schoolId: profile[0].schoolId, creationRequestId, status: 'active' })
      .returning()
    return inserted[0] ?? null
  }

  public async findTemplateByCreationRequestId(creationRequestId: string, teacherId: number) {
    const rows = await this.db
      .select()
      .from(schema.trainingTemplates)
      .where(
        and(
          eq(schema.trainingTemplates.creationRequestId, creationRequestId),
          eq(schema.trainingTemplates.teacherId, teacherId),
          sql`${schema.trainingTemplates.schoolId} = (SELECT school_id FROM teacher_profiles WHERE user_id = ${teacherId} ORDER BY id LIMIT 1)`,
        ),
      )
      .limit(1)
    return rows[0] ?? null
  }

  public async findTemplateForTeacher(templateId: number, teacherId: number) {
    const rows = await this.db
      .select()
      .from(schema.trainingTemplates)
      .where(and(eq(schema.trainingTemplates.id, templateId), eq(schema.trainingTemplates.teacherId, teacherId), sql`${schema.trainingTemplates.schoolId} = (SELECT school_id FROM teacher_profiles WHERE user_id = ${teacherId} ORDER BY id LIMIT 1)`))
      .limit(1)
    return rows[0] ?? null
  }

  public async findTemplateForSchool(templateId: number, schoolId: number) {
    const rows = await this.db
      .select()
      .from(schema.trainingTemplates)
      .where(and(eq(schema.trainingTemplates.id, templateId), eq(schema.trainingTemplates.schoolId, schoolId)))
      .limit(1)
    return rows[0] ?? null
  }

  public async updateTemplateForTeacher(templateId: number, teacherId: number, data: TrainingTemplateChanges) {
    const updated = await this.db
      .update(schema.trainingTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.trainingTemplates.id, templateId), eq(schema.trainingTemplates.teacherId, teacherId), sql`${schema.trainingTemplates.schoolId} = (SELECT school_id FROM teacher_profiles WHERE user_id = ${teacherId} ORDER BY id LIMIT 1)`))
      .returning()
    return updated[0] ?? null
  }

  public async updateTemplateForSchool(templateId: number, schoolId: number, data: TrainingTemplateChanges) {
    const result = await this.d1
      .prepare(
        `UPDATE training_templates
         SET title = ?, description = ?, objective = ?, category = ?, estimated_duration = ?, difficulty = ?,
             sets = ?, reps = ?, rest_seconds = ?, video_url = ?, safety_notes = ?, updated_at = ?
         WHERE id = ? AND school_id = ?`,
      )
      .bind(
        data.title,
        data.description ?? null,
        data.objective ?? null,
        data.category,
        data.estimatedDuration ?? null,
        data.difficulty ?? null,
        data.sets ?? null,
        data.reps ?? null,
        data.restSeconds ?? null,
        data.videoUrl ?? null,
        data.safetyNotes ?? null,
        Math.floor(Date.now() / 1000),
        templateId,
        schoolId,
      )
      .run()
    if (result.meta.changes !== 1) return null
    return this.findTemplateForSchool(templateId, schoolId)
  }

  public async archiveTemplateForTeacher(templateId: number, teacherId: number) {
    const updated = await this.db
      .update(schema.trainingTemplates)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(and(eq(schema.trainingTemplates.id, templateId), eq(schema.trainingTemplates.teacherId, teacherId), sql`${schema.trainingTemplates.schoolId} = (SELECT school_id FROM teacher_profiles WHERE user_id = ${teacherId} ORDER BY id LIMIT 1)`))
      .returning()
    return updated[0] ?? null
  }

  public async archiveTemplateForSchool(templateId: number, schoolId: number) {
    const result = await this.d1
      .prepare(
        `UPDATE training_templates SET status = 'archived', updated_at = ?
         WHERE id = ? AND school_id = ?`,
      )
      .bind(Math.floor(Date.now() / 1000), templateId, schoolId)
      .run()
    if (result.meta.changes !== 1) return null
    return this.findTemplateForSchool(templateId, schoolId)
  }

  // Jadual Latihan
  public async getSchedulesByTeacher(teacherId: number, limit = 50) {
    const scheduleRows = await this.db
      .select({ schedule: schema.trainingSchedules, className: schema.classes.name })
      .from(schema.trainingSchedules)
      .innerJoin(schema.classes, eq(schema.trainingSchedules.classId, schema.classes.id))
      .where(eq(schema.trainingSchedules.teacherId, teacherId))
      .orderBy(
        asc(schema.trainingSchedules.classId),
        asc(schema.trainingSchedules.orderIndex),
        asc(schema.trainingSchedules.id),
      )
      .limit(limit)
      .then((rows) => rows.map(({ schedule, className }) => ({ ...schedule, className })))

    if (scheduleRows.length === 0) return []
    const scheduleIds = scheduleRows.map((schedule) => schedule.id)
    const activities = await this.db
      .select()
      .from(schema.trainingScheduleActivities)
      .where(inArray(schema.trainingScheduleActivities.scheduleId, scheduleIds))
      .orderBy(asc(schema.trainingScheduleActivities.scheduleId), asc(schema.trainingScheduleActivities.orderIndex))

    const activitiesBySchedule = new Map<number, Array<typeof schema.trainingScheduleActivities.$inferSelect>>()
    for (const activity of activities) {
      const scheduleActivities = activitiesBySchedule.get(activity.scheduleId) ?? []
      scheduleActivities.push(activity)
      activitiesBySchedule.set(activity.scheduleId, scheduleActivities)
    }

    return scheduleRows.map((schedule) => ({
      ...schedule,
      activities: activitiesBySchedule.get(schedule.id) ?? [],
    }))
  }

  public async getSchedulesBySchool(schoolId: number, limit = 100) {
    const scheduleRows = await this.db
      .select({ schedule: schema.trainingSchedules })
      .from(schema.trainingSchedules)
      .innerJoin(schema.classes, eq(schema.trainingSchedules.classId, schema.classes.id))
      .where(eq(schema.classes.schoolId, schoolId))
      .orderBy(
        asc(schema.trainingSchedules.classId),
        asc(schema.trainingSchedules.orderIndex),
        asc(schema.trainingSchedules.id),
      )
      .limit(limit)
      .then((rows) => rows.map((row) => row.schedule))

    if (scheduleRows.length === 0) return []
    const scheduleIds = scheduleRows.map((schedule) => schedule.id)
    const activities = await this.db
      .select()
      .from(schema.trainingScheduleActivities)
      .where(inArray(schema.trainingScheduleActivities.scheduleId, scheduleIds))
      .orderBy(asc(schema.trainingScheduleActivities.scheduleId), asc(schema.trainingScheduleActivities.orderIndex))

    const activitiesBySchedule = new Map<number, Array<typeof schema.trainingScheduleActivities.$inferSelect>>()
    for (const activity of activities) {
      const scheduleActivities = activitiesBySchedule.get(activity.scheduleId) ?? []
      scheduleActivities.push(activity)
      activitiesBySchedule.set(activity.scheduleId, scheduleActivities)
    }

    return scheduleRows.map((schedule) => ({
      ...schedule,
      activities: activitiesBySchedule.get(schedule.id) ?? [],
    }))
  }

  public async findScheduleForTeacher(scheduleId: number, teacherId: number) {
    const rows = await this.db
      .select()
      .from(schema.trainingSchedules)
      .where(and(eq(schema.trainingSchedules.id, scheduleId), eq(schema.trainingSchedules.teacherId, teacherId)))
      .limit(1)
    return rows[0] ?? null
  }

  public async reorderScheduleForTeacher(scheduleId: number, teacherId: number, direction: 'up' | 'down') {
    const schedule = await this.findScheduleForTeacher(scheduleId, teacherId)
    if (!schedule) return null

    const classSchedules = await this.db
      .select({ id: schema.trainingSchedules.id, orderIndex: schema.trainingSchedules.orderIndex })
      .from(schema.trainingSchedules)
      .where(
        and(
          eq(schema.trainingSchedules.teacherId, teacherId),
          eq(schema.trainingSchedules.classId, schedule.classId),
        ),
      )
      .orderBy(asc(schema.trainingSchedules.orderIndex), asc(schema.trainingSchedules.id))

    const currentIndex = classSchedules.findIndex((item) => item.id === scheduleId)
    if (currentIndex < 0) return null
    const neighborIndex = currentIndex + (direction === 'up' ? -1 : 1)
    const neighbor = classSchedules[neighborIndex]
    if (!neighbor) return { schedule, moved: false }

    const result = await this.d1
      .prepare(
        `UPDATE training_schedules
         SET order_index = CASE id WHEN ? THEN ? WHEN ? THEN ? ELSE order_index END,
             updated_at = ?
         WHERE teacher_id = ? AND class_id = ? AND id IN (?, ?)
           AND (
             SELECT COUNT(*) FROM training_schedules
             WHERE teacher_id = ? AND class_id = ?
               AND ((id = ? AND order_index = ?) OR (id = ? AND order_index = ?))
           ) = 2`,
      )
      .bind(
        scheduleId,
        neighbor.orderIndex,
        neighbor.id,
        schedule.orderIndex,
        Math.floor(Date.now() / 1000),
        teacherId,
        schedule.classId,
        scheduleId,
        neighbor.id,
        teacherId,
        schedule.classId,
        scheduleId,
        schedule.orderIndex,
        neighbor.id,
        neighbor.orderIndex,
      )
      .run()

    const updatedSchedule = await this.findScheduleForTeacher(scheduleId, teacherId)
    if (!updatedSchedule) return null
    return { schedule: updatedSchedule, moved: result.meta.changes === 2 }
  }

  public async findScheduleForSchool(scheduleId: number, schoolId: number) {
    const rows = await this.db
      .select({ schedule: schema.trainingSchedules })
      .from(schema.trainingSchedules)
      .innerJoin(schema.classes, eq(schema.trainingSchedules.classId, schema.classes.id))
      .where(and(eq(schema.trainingSchedules.id, scheduleId), eq(schema.classes.schoolId, schoolId)))
      .limit(1)
    return rows[0]?.schedule ?? null
  }

  public async findScheduleByCreationRequestIdInSchool(creationRequestId: string, schoolId: number) {
    const rows = await this.db
      .select({ schedule: schema.trainingSchedules })
      .from(schema.trainingSchedules)
      .innerJoin(schema.classes, eq(schema.trainingSchedules.classId, schema.classes.id))
      .where(
        and(
          eq(schema.trainingSchedules.creationRequestId, creationRequestId),
          eq(schema.classes.schoolId, schoolId),
        ),
      )
      .limit(1)
    return rows[0]?.schedule ?? null
  }

  public async createScheduleAtomicallyForSchool(
    data: typeof schema.trainingSchedules.$inferInsert,
    activities: TrainingScheduleActivityInput[],
    creationRequestId: string,
    schoolId: number,
  ) {
    const existing = await this.findScheduleByCreationRequestIdInSchool(creationRequestId, schoolId)
    if (existing) return { ...existing, activities: await this.getScheduleActivities(existing.id) }

    const nowSeconds = Math.floor(Date.now() / 1000)
    const statements: D1PreparedStatement[] = [
      this.d1
        .prepare(
          `INSERT INTO training_schedules
            (creation_request_id, teacher_id, class_id, title, training_date, due_date, instructions,
             evidence_required, teacher_notes, status, order_index, created_at, updated_at)
           SELECT ?, ?, classes.id, ?, ?, ?, ?, ?, ?, ?,
                  COALESCE((SELECT MAX(order_index) + 1 FROM training_schedules WHERE class_id = classes.id), 0),
                  ?, ?
           FROM classes
           WHERE classes.id = ? AND classes.school_id = ? AND classes.status = 'active'`,
        )
        .bind(
          creationRequestId,
          data.teacherId,
          data.title,
          data.trainingDate,
          data.dueDate,
          data.instructions ?? null,
          data.evidenceRequired ? 1 : 0,
          data.teacherNotes ?? null,
          data.status ?? 'published',
          nowSeconds,
          nowSeconds,
          data.classId,
          schoolId,
        ),
      ...activities.map((activity, orderIndex) =>
        this.d1
          .prepare(
            `INSERT INTO training_schedule_activities
              (schedule_id, template_id, title, sets, reps, video_url, order_index)
             SELECT id, ?, ?, ?, ?, ?, ? FROM training_schedules
             WHERE creation_request_id = ? AND teacher_id = ?`,
          )
          .bind(
            activity.templateId ?? null,
            activity.title,
            activity.sets ?? 1,
            activity.reps ?? null,
            activity.videoUrl ?? null,
            orderIndex,
            creationRequestId,
            data.teacherId,
          ),
      ),
      this.d1
        .prepare(
          `INSERT INTO training_assignments (schedule_id, student_id, status, created_at, updated_at)
           SELECT training_schedules.id, class_students.student_id, 'not_started', ?, ?
           FROM training_schedules
           INNER JOIN classes ON classes.id = training_schedules.class_id
           INNER JOIN class_students ON class_students.class_id = training_schedules.class_id
           INNER JOIN student_profiles ON student_profiles.user_id = class_students.student_id
           WHERE training_schedules.creation_request_id = ?
             AND training_schedules.teacher_id = ?
             AND classes.school_id = ?
             AND class_students.status = 'active'
             AND student_profiles.school_id = ?`,
        )
        .bind(nowSeconds, nowSeconds, creationRequestId, data.teacherId, schoolId, schoolId),
    ]

    await this.d1.batch(statements)
    const schedule = await this.findScheduleByCreationRequestIdInSchool(creationRequestId, schoolId)
    if (!schedule) return null
    return { ...schedule, activities: await this.getScheduleActivities(schedule.id) }
  }

  public async hasSubmissionsForSchedule(scheduleId: number, teacherId: number) {
    const rows = await this.db
      .select({ id: schema.trainingSubmissions.id })
      .from(schema.trainingSubmissions)
      .innerJoin(schema.trainingSchedules, eq(schema.trainingSubmissions.scheduleId, schema.trainingSchedules.id))
      .where(and(eq(schema.trainingSubmissions.scheduleId, scheduleId), eq(schema.trainingSchedules.teacherId, teacherId)))
      .limit(1)
    return rows.length > 0
  }

  public async hasSubmissionsForScheduleInSchool(scheduleId: number, schoolId: number) {
    const rows = await this.db
      .select({ id: schema.trainingSubmissions.id })
      .from(schema.trainingSubmissions)
      .innerJoin(schema.trainingSchedules, eq(schema.trainingSubmissions.scheduleId, schema.trainingSchedules.id))
      .innerJoin(schema.classes, eq(schema.trainingSchedules.classId, schema.classes.id))
      .where(and(eq(schema.trainingSubmissions.scheduleId, scheduleId), eq(schema.classes.schoolId, schoolId)))
      .limit(1)
    return rows.length > 0
  }

  public async reviewSubmissionForSchool(
    submissionId: number,
    schoolId: number,
    reviewStatus: 'approved' | 'needs_correction' | 'rejected',
    teacherFeedback: string,
    reviewedBy: number,
  ) {
    const now = new Date()
    const nowSeconds = Math.floor(now.getTime() / 1000)
    const assignmentStatus =
      reviewStatus === 'approved' ? 'approved' : reviewStatus === 'needs_correction' ? 'needs_correction' : 'rejected'
    const results = await this.d1.batch([
      this.d1
        .prepare(
          `UPDATE training_submissions
           SET review_status = ?, teacher_feedback = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
           WHERE id = ? AND EXISTS (
             SELECT 1 FROM training_schedules
             INNER JOIN classes ON classes.id = training_schedules.class_id
             WHERE training_schedules.id = training_submissions.schedule_id
               AND classes.school_id = ?
           )`,
        )
        .bind(reviewStatus, teacherFeedback, reviewedBy, now.toISOString(), nowSeconds, submissionId, schoolId),
      this.d1
        .prepare(
          `UPDATE training_assignments
           SET status = ?, updated_at = ?
           WHERE id = (
             SELECT assignment_id FROM training_submissions
             WHERE id = ? AND reviewed_by = ? AND review_status = ?
               AND EXISTS (
                 SELECT 1 FROM training_schedules
                 INNER JOIN classes ON classes.id = training_schedules.class_id
                 WHERE training_schedules.id = training_submissions.schedule_id
                   AND classes.school_id = ?
               )
           )`,
        )
        .bind(assignmentStatus, nowSeconds, submissionId, reviewedBy, reviewStatus, schoolId),
    ])

    if ((results[0]?.meta.changes ?? 0) !== 1) return null
    return this.findSubmissionForSchool(submissionId, schoolId)
  }

  public async updateScheduleForTeacher(
    scheduleId: number,
    teacherId: number,
    changes: TrainingScheduleChanges,
    activities: TrainingScheduleActivityInput[],
    reassignedStudentIds?: number[],
  ) {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const scheduleEligible = `EXISTS (
      SELECT 1 FROM training_schedules
      WHERE id = ? AND teacher_id = ?
        AND NOT EXISTS (SELECT 1 FROM training_submissions WHERE schedule_id = ?)
    )`
    const statements: D1PreparedStatement[] = [
      this.d1
        .prepare(
          `UPDATE training_schedules
           SET class_id = ?,
               order_index = CASE WHEN class_id <> ?
                 THEN COALESCE((SELECT MAX(order_index) + 1 FROM training_schedules WHERE class_id = ?), 0)
                 ELSE order_index
               END,
               title = ?, training_date = ?, due_date = ?, instructions = ?,
               evidence_required = ?, teacher_notes = ?, updated_at = ?
           WHERE id = ? AND teacher_id = ?
             AND NOT EXISTS (SELECT 1 FROM training_submissions WHERE schedule_id = ?)`,
        )
        .bind(
          changes.classId,
          changes.classId,
          changes.classId,
          changes.title,
          changes.trainingDate,
          changes.dueDate,
          changes.instructions ?? null,
          changes.evidenceRequired ? 1 : 0,
          changes.teacherNotes ?? null,
          nowSeconds,
          scheduleId,
          teacherId,
          scheduleId,
        ),
      this.d1
        .prepare(
          `DELETE FROM training_schedule_activities
           WHERE schedule_id = ? AND ${scheduleEligible}`,
        )
        .bind(scheduleId, scheduleId, teacherId, scheduleId),
      ...activities.map((activity, orderIndex) =>
        this.d1
          .prepare(
            `INSERT INTO training_schedule_activities
             (schedule_id, template_id, title, sets, reps, video_url, order_index)
             SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${scheduleEligible}`,
          )
          .bind(
            scheduleId,
            activity.templateId ?? null,
            activity.title,
            activity.sets ?? 1,
            activity.reps ?? null,
            activity.videoUrl ?? null,
            orderIndex,
            scheduleId,
            teacherId,
            scheduleId,
          ),
      ),
    ]

    if (reassignedStudentIds !== undefined) {
      statements.push(
        this.d1
          .prepare(`DELETE FROM training_assignments WHERE schedule_id = ? AND ${scheduleEligible}`)
          .bind(scheduleId, scheduleId, teacherId, scheduleId),
      )
      for (const studentId of reassignedStudentIds) {
        statements.push(
          this.d1
            .prepare(
              `INSERT INTO training_assignments (schedule_id, student_id, status, created_at, updated_at)
               SELECT ?, ?, 'not_started', ?, ? WHERE ${scheduleEligible}`,
            )
            .bind(scheduleId, studentId, nowSeconds, nowSeconds, scheduleId, teacherId, scheduleId),
        )
      }
    }

    const results = await this.d1.batch(statements)
    if (results[0]?.meta.changes !== 1) return null

    const schedule = await this.findScheduleForTeacher(scheduleId, teacherId)
    if (!schedule) return null
    return {
      ...schedule,
      activities: await this.getScheduleActivities(scheduleId),
    }
  }

  public async updateScheduleForSchool(
    scheduleId: number,
    schoolId: number,
    changes: TrainingScheduleChanges,
    activities: TrainingScheduleActivityInput[],
    reassignedStudentIds?: number[],
  ) {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const scheduleEligible = `EXISTS (
      SELECT 1 FROM training_schedules scoped_schedule
      INNER JOIN classes scoped_class ON scoped_class.id = scoped_schedule.class_id
      WHERE scoped_schedule.id = ? AND scoped_class.school_id = ?
        AND NOT EXISTS (SELECT 1 FROM training_submissions WHERE schedule_id = ?)
    )`
    const statements: D1PreparedStatement[] = [
      this.d1
        .prepare(
          `UPDATE training_schedules
           SET class_id = ?,
               order_index = CASE WHEN class_id <> ?
                 THEN COALESCE((SELECT MAX(order_index) + 1 FROM training_schedules WHERE class_id = ?), 0)
                 ELSE order_index
               END,
               title = ?, training_date = ?, due_date = ?, instructions = ?,
               evidence_required = ?, teacher_notes = ?, updated_at = ?
           WHERE id = ?
             AND EXISTS (SELECT 1 FROM classes WHERE classes.id = ? AND classes.school_id = ?)
             AND EXISTS (SELECT 1 FROM classes WHERE classes.id = training_schedules.class_id AND classes.school_id = ?)
             AND NOT EXISTS (SELECT 1 FROM training_submissions WHERE schedule_id = ?)`,
        )
        .bind(
          changes.classId,
          changes.classId,
          changes.classId,
          changes.title,
          changes.trainingDate,
          changes.dueDate,
          changes.instructions ?? null,
          changes.evidenceRequired ? 1 : 0,
          changes.teacherNotes ?? null,
          nowSeconds,
          scheduleId,
          changes.classId,
          schoolId,
          schoolId,
          scheduleId,
        ),
      this.d1
        .prepare(`DELETE FROM training_schedule_activities WHERE schedule_id = ? AND ${scheduleEligible}`)
        .bind(scheduleId, scheduleId, schoolId, scheduleId),
      ...activities.map((activity, orderIndex) =>
        this.d1
          .prepare(
            `INSERT INTO training_schedule_activities
              (schedule_id, template_id, title, sets, reps, video_url, order_index)
             SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${scheduleEligible}`,
          )
          .bind(
            scheduleId,
            activity.templateId ?? null,
            activity.title,
            activity.sets ?? 1,
            activity.reps ?? null,
            activity.videoUrl ?? null,
            orderIndex,
            scheduleId,
            schoolId,
            scheduleId,
          ),
      ),
    ]

    if (reassignedStudentIds !== undefined) {
      statements.push(
        this.d1
          .prepare(`DELETE FROM training_assignments WHERE schedule_id = ? AND ${scheduleEligible}`)
          .bind(scheduleId, scheduleId, schoolId, scheduleId),
      )
      for (const studentId of reassignedStudentIds) {
        statements.push(
          this.d1
            .prepare(
              `INSERT INTO training_assignments (schedule_id, student_id, status, created_at, updated_at)
               SELECT ?, ?, 'not_started', ?, ? WHERE ${scheduleEligible}`,
            )
            .bind(scheduleId, studentId, nowSeconds, nowSeconds, scheduleId, schoolId, scheduleId),
        )
      }
    }

    const results = await this.d1.batch(statements)
    if (results[0]?.meta.changes !== 1) return null
    const schedule = await this.findScheduleForSchool(scheduleId, schoolId)
    if (!schedule) return null
    return { ...schedule, activities: await this.getScheduleActivities(scheduleId) }
  }

  public async deleteScheduleForTeacher(scheduleId: number, teacherId: number) {
    const deleted = await this.d1
      .prepare(
        `DELETE FROM training_schedules
         WHERE id = ? AND teacher_id = ?
           AND NOT EXISTS (SELECT 1 FROM training_submissions WHERE schedule_id = ?)`,
      )
      .bind(scheduleId, teacherId, scheduleId)
      .run()
    return deleted.meta.changes > 0
  }

  public async archiveScheduleForTeacher(scheduleId: number, teacherId: number) {
    const updated = await this.db
      .update(schema.trainingSchedules)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(and(eq(schema.trainingSchedules.id, scheduleId), eq(schema.trainingSchedules.teacherId, teacherId)))
      .returning()
    return updated[0] ?? null
  }

  public async archiveScheduleForSchool(scheduleId: number, schoolId: number) {
    const result = await this.d1
      .prepare(
        `UPDATE training_schedules SET status = 'archived', updated_at = ?
         WHERE id = ? AND class_id IN (SELECT id FROM classes WHERE school_id = ?)`,
      )
      .bind(Math.floor(Date.now() / 1000), scheduleId, schoolId)
      .run()
    if (result.meta.changes !== 1) return null
    return this.findScheduleForSchool(scheduleId, schoolId)
  }

  public async getSchedulesByClass(classId: number) {
    return await this.db
      .select()
      .from(schema.trainingSchedules)
      .where(and(eq(schema.trainingSchedules.classId, classId), eq(schema.trainingSchedules.status, 'published')))
      .orderBy(asc(schema.trainingSchedules.orderIndex), asc(schema.trainingSchedules.id))
  }

  public async createSchedule(data: typeof schema.trainingSchedules.$inferInsert) {
    const currentSchedules = await this.db
      .select({ orderIndex: schema.trainingSchedules.orderIndex })
      .from(schema.trainingSchedules)
      .where(eq(schema.trainingSchedules.classId, data.classId))
      .orderBy(desc(schema.trainingSchedules.orderIndex))
      .limit(1)
    const nextOrderIndex = (currentSchedules[0]?.orderIndex ?? -1) + 1
    const inserted = await this.db
      .insert(schema.trainingSchedules)
      .values({ ...data, orderIndex: data.orderIndex ?? nextOrderIndex })
      .returning()
    return inserted[0]
  }

  public async createScheduleAtomically(
    data: typeof schema.trainingSchedules.$inferInsert,
    activities: TrainingScheduleActivityInput[],
    creationRequestId: string,
  ) {
    const existing = await this.findScheduleByCreationRequestId(creationRequestId, data.teacherId)
    if (existing) return { ...existing, activities: await this.getScheduleActivities(existing.id) }

    const nowSeconds = Math.floor(Date.now() / 1000)
    const statements: D1PreparedStatement[] = [
      this.d1
        .prepare(
          `INSERT INTO training_schedules
            (creation_request_id, teacher_id, class_id, title, training_date, due_date, instructions,
             evidence_required, teacher_notes, status, order_index, created_at, updated_at)
           SELECT ?, ?, classes.id, ?, ?, ?, ?, ?, ?, ?,
                  COALESCE((SELECT MAX(order_index) + 1 FROM training_schedules WHERE class_id = classes.id), 0),
                  ?, ?
           FROM classes
           WHERE classes.id = ? AND classes.teacher_id = ? AND classes.status = 'active'`,
        )
        .bind(
          creationRequestId,
          data.teacherId,
          data.title,
          data.trainingDate,
          data.dueDate,
          data.instructions ?? null,
          data.evidenceRequired ? 1 : 0,
          data.teacherNotes ?? null,
          data.status ?? 'published',
          nowSeconds,
          nowSeconds,
          data.classId,
          data.teacherId,
        ),
      ...activities.map((activity, orderIndex) =>
        this.d1
          .prepare(
            `INSERT INTO training_schedule_activities
              (schedule_id, template_id, title, sets, reps, video_url, order_index)
             SELECT id, ?, ?, ?, ?, ?, ? FROM training_schedules
             WHERE creation_request_id = ? AND teacher_id = ?`,
          )
          .bind(
            activity.templateId ?? null,
            activity.title,
            activity.sets ?? 1,
            activity.reps ?? null,
            activity.videoUrl ?? null,
            orderIndex,
            creationRequestId,
            data.teacherId,
          ),
      ),
      this.d1
        .prepare(
          `INSERT INTO training_assignments (schedule_id, student_id, status, created_at, updated_at)
           SELECT training_schedules.id, class_students.student_id, 'not_started', ?, ?
           FROM training_schedules
           INNER JOIN class_students ON class_students.class_id = training_schedules.class_id
           WHERE training_schedules.creation_request_id = ?
             AND training_schedules.teacher_id = ?
             AND class_students.status = 'active'`,
        )
        .bind(nowSeconds, nowSeconds, creationRequestId, data.teacherId),
    ]

    await this.d1.batch(statements)
    const schedule = await this.findScheduleByCreationRequestId(creationRequestId, data.teacherId)
    if (!schedule) return null
    return { ...schedule, activities: await this.getScheduleActivities(schedule.id) }
  }

  public async findScheduleByCreationRequestId(creationRequestId: string, teacherId: number) {
    const rows = await this.db
      .select()
      .from(schema.trainingSchedules)
      .where(
        and(
          eq(schema.trainingSchedules.creationRequestId, creationRequestId),
          eq(schema.trainingSchedules.teacherId, teacherId),
        ),
      )
      .limit(1)
    return rows[0] ?? null
  }

  public async addScheduleActivity(data: typeof schema.trainingScheduleActivities.$inferInsert) {
    const inserted = await this.db.insert(schema.trainingScheduleActivities).values(data).returning()
    return inserted[0]
  }

  // Tugasan & Penghantaran
  public async getPendingAssignmentsForStudentOnDate(studentId: number, date: string, limit: number) {
    return this.db
      .select({ assignmentId: schema.trainingAssignments.id, title: schema.trainingSchedules.title })
      .from(schema.trainingAssignments)
      .innerJoin(schema.trainingSchedules, eq(schema.trainingAssignments.scheduleId, schema.trainingSchedules.id))
      .where(and(
        eq(schema.trainingAssignments.studentId, studentId),
        eq(schema.trainingSchedules.trainingDate, date),
        eq(schema.trainingSchedules.status, 'published'),
        notInArray(schema.trainingAssignments.status, ['submitted', 'approved']),
      ))
      .orderBy(
        asc(schema.trainingSchedules.classId),
        asc(schema.trainingSchedules.orderIndex),
        asc(schema.trainingSchedules.id),
        asc(schema.trainingAssignments.id),
      )
      .limit(limit)
  }

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
        classId: schema.trainingSchedules.classId,
        className: schema.classes.name,
        orderIndex: schema.trainingSchedules.orderIndex,
        title: schema.trainingSchedules.title,
        trainingDate: schema.trainingSchedules.trainingDate,
        dueDate: schema.trainingSchedules.dueDate,
        instructions: schema.trainingSchedules.instructions,
        evidenceRequired: schema.trainingSchedules.evidenceRequired,
      })
      .from(schema.trainingAssignments)
      .innerJoin(schema.trainingSchedules, eq(schema.trainingAssignments.scheduleId, schema.trainingSchedules.id))
      .innerJoin(schema.classes, eq(schema.trainingSchedules.classId, schema.classes.id))
      .where(eq(schema.trainingAssignments.studentId, studentId))
      .orderBy(
        asc(schema.classes.name),
        asc(schema.trainingSchedules.classId),
        asc(schema.trainingSchedules.orderIndex),
        asc(schema.trainingSchedules.id),
        asc(schema.trainingAssignments.id),
      )

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

  public async submitTraining(data: typeof schema.trainingSubmissions.$inferInsert): Promise<SubmitTrainingResult> {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const results = await this.d1.batch([
      this.d1
        .prepare(
          `INSERT INTO training_submissions
            (assignment_id, student_id, schedule_id, submission_date, duration_minutes, sets_completed,
             reps_completed, student_notes, review_status, created_at, updated_at)
           SELECT assignment.id, assignment.student_id, assignment.schedule_id, ?, ?, ?, ?, ?, 'submitted', ?, ?
           FROM training_assignments AS assignment
           WHERE assignment.id = ?
             AND assignment.student_id = ?
             AND assignment.schedule_id = ?
             AND assignment.status NOT IN ('submitted', 'approved')`,
        )
        .bind(
          data.submissionDate,
          data.durationMinutes ?? null,
          data.setsCompleted ?? null,
          data.repsCompleted ?? null,
          data.studentNotes ?? null,
          nowSeconds,
          nowSeconds,
          data.assignmentId,
          data.studentId,
          data.scheduleId,
        ),
      this.d1
        .prepare(
          `UPDATE training_assignments
           SET status = 'submitted', updated_at = ?
           WHERE id = ?
             AND student_id = ?
             AND schedule_id = ?
             AND status NOT IN ('submitted', 'approved')
             AND EXISTS (
               SELECT 1 FROM training_submissions
               WHERE assignment_id = ? AND student_id = ?
             )`,
        )
        .bind(
          nowSeconds,
          data.assignmentId,
          data.studentId,
          data.scheduleId,
          data.assignmentId,
          data.studentId,
        ),
    ])

    const inserted = results[0]
    if (!inserted || inserted.meta.changes !== 1) {
      const assignment = await this.db
        .select({ id: schema.trainingAssignments.id })
        .from(schema.trainingAssignments)
        .where(
          and(
            eq(schema.trainingAssignments.id, data.assignmentId),
            eq(schema.trainingAssignments.studentId, data.studentId),
            eq(schema.trainingAssignments.scheduleId, data.scheduleId),
          ),
        )
        .limit(1)
      return assignment.length > 0 ? { kind: 'already_submitted' } : { kind: 'not_found' }
    }

    const submissionId = inserted.meta.last_row_id
    const submission = await this.db
      .select()
      .from(schema.trainingSubmissions)
      .where(eq(schema.trainingSubmissions.id, submissionId))
      .limit(1)
    if (!submission[0]) throw new Error('Penghantaran latihan tidak dapat dibaca selepas disimpan.')
    return { kind: 'created', submission: submission[0] }
  }

  public async getSubmissionsForTeacher(teacherId: number, limit = 50) {
    return await this.db
      .select({
        submissionId: schema.trainingSubmissions.id,
        submissionDate: schema.trainingSubmissions.submissionDate,
        reviewStatus: schema.trainingSubmissions.reviewStatus,
        durationMinutes: schema.trainingSubmissions.durationMinutes,
        setsCompleted: schema.trainingSubmissions.setsCompleted,
        repsCompleted: schema.trainingSubmissions.repsCompleted,
        studentName: schema.studentProfiles.fullName,
        scheduleTitle: schema.trainingSchedules.title,
      })
      .from(schema.trainingSubmissions)
      .innerJoin(schema.trainingSchedules, eq(schema.trainingSubmissions.scheduleId, schema.trainingSchedules.id))
      .innerJoin(schema.users, eq(schema.trainingSubmissions.studentId, schema.users.id))
      .innerJoin(schema.studentProfiles, eq(schema.users.id, schema.studentProfiles.userId))
      .where(eq(schema.trainingSchedules.teacherId, teacherId))
      .orderBy(desc(schema.trainingSubmissions.submissionDate), desc(schema.trainingSubmissions.id))
      .limit(limit)
  }

  public async getSubmissionsForSchool(schoolId: number, limit = 100) {
    return await this.db
      .select({
        submissionId: schema.trainingSubmissions.id,
        scheduleId: schema.trainingSchedules.id,
        scheduleTitle: schema.trainingSchedules.title,
        classId: schema.classes.id,
        className: schema.classes.name,
        studentId: schema.trainingSubmissions.studentId,
        studentIdNum: schema.studentProfiles.studentIdNum,
        studentName: schema.studentProfiles.fullName,
        submissionDate: schema.trainingSubmissions.submissionDate,
        reviewStatus: schema.trainingSubmissions.reviewStatus,
        durationMinutes: schema.trainingSubmissions.durationMinutes,
        setsCompleted: schema.trainingSubmissions.setsCompleted,
        repsCompleted: schema.trainingSubmissions.repsCompleted,
      })
      .from(schema.trainingSubmissions)
      .innerJoin(schema.trainingSchedules, eq(schema.trainingSubmissions.scheduleId, schema.trainingSchedules.id))
      .innerJoin(schema.classes, eq(schema.trainingSchedules.classId, schema.classes.id))
      .innerJoin(schema.studentProfiles, eq(schema.trainingSubmissions.studentId, schema.studentProfiles.userId))
      .where(and(eq(schema.classes.schoolId, schoolId), eq(schema.studentProfiles.schoolId, schoolId)))
      .orderBy(desc(schema.trainingSubmissions.submissionDate), desc(schema.trainingSubmissions.id))
      .limit(limit)
  }

  public async findSubmissionForTeacher(submissionId: number, teacherId: number) {
    const rows = await this.db
      .select({
        submissionId: schema.trainingSubmissions.id,
        scheduleId: schema.trainingSubmissions.scheduleId,
        scheduleTitle: schema.trainingSchedules.title,
        reviewStatus: schema.trainingSubmissions.reviewStatus,
        submissionDate: schema.trainingSubmissions.submissionDate,
      })
      .from(schema.trainingSubmissions)
      .innerJoin(schema.trainingSchedules, eq(schema.trainingSubmissions.scheduleId, schema.trainingSchedules.id))
      .where(and(eq(schema.trainingSubmissions.id, submissionId), eq(schema.trainingSchedules.teacherId, teacherId)))
      .limit(1)
    return rows[0] ?? null
  }

  public async findSubmissionForSchool(submissionId: number, schoolId: number) {
    const rows = await this.db
      .select({
        submissionId: schema.trainingSubmissions.id,
        scheduleId: schema.trainingSubmissions.scheduleId,
        scheduleTitle: schema.trainingSchedules.title,
        classId: schema.classes.id,
        className: schema.classes.name,
        studentId: schema.trainingSubmissions.studentId,
        studentIdNum: schema.studentProfiles.studentIdNum,
        studentName: schema.studentProfiles.fullName,
        studentNotes: schema.trainingSubmissions.studentNotes,
        durationMinutes: schema.trainingSubmissions.durationMinutes,
        setsCompleted: schema.trainingSubmissions.setsCompleted,
        repsCompleted: schema.trainingSubmissions.repsCompleted,
        reviewStatus: schema.trainingSubmissions.reviewStatus,
        submissionDate: schema.trainingSubmissions.submissionDate,
      })
      .from(schema.trainingSubmissions)
      .innerJoin(schema.trainingSchedules, eq(schema.trainingSubmissions.scheduleId, schema.trainingSchedules.id))
      .innerJoin(schema.classes, eq(schema.trainingSchedules.classId, schema.classes.id))
      .innerJoin(schema.studentProfiles, eq(schema.trainingSubmissions.studentId, schema.studentProfiles.userId))
      .where(
        and(
          eq(schema.trainingSubmissions.id, submissionId),
          eq(schema.classes.schoolId, schoolId),
          eq(schema.studentProfiles.schoolId, schoolId),
        ),
      )
      .limit(1)
    return rows[0] ?? null
  }

  public async reviewSubmissionForTeacher(
    submissionId: number,
    teacherId: number,
    reviewStatus: 'approved' | 'needs_correction' | 'rejected',
    teacherFeedback: string,
    reviewedBy: number,
  ) {
    const now = new Date()
    const nowSeconds = Math.floor(now.getTime() / 1000)
    const assignmentStatus =
      reviewStatus === 'approved' ? 'approved' : reviewStatus === 'needs_correction' ? 'needs_correction' : 'rejected'
    const results = await this.d1.batch([
      this.d1
        .prepare(
          `UPDATE training_submissions
           SET review_status = ?, teacher_feedback = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
           WHERE id = ? AND EXISTS (
             SELECT 1 FROM training_schedules
             WHERE training_schedules.id = training_submissions.schedule_id
               AND training_schedules.teacher_id = ?
           )`,
        )
        .bind(reviewStatus, teacherFeedback, reviewedBy, now.toISOString(), nowSeconds, submissionId, teacherId),
      this.d1
        .prepare(
          `UPDATE training_assignments
           SET status = ?, updated_at = ?
           WHERE id = (
             SELECT assignment_id FROM training_submissions
             WHERE id = ? AND reviewed_by = ? AND review_status = ?
               AND EXISTS (
                 SELECT 1 FROM training_schedules
                 WHERE training_schedules.id = training_submissions.schedule_id
                   AND training_schedules.teacher_id = ?
               )
           )`,
        )
        .bind(assignmentStatus, nowSeconds, submissionId, reviewedBy, reviewStatus, teacherId),
    ])

    if ((results[0]?.meta.changes ?? 0) !== 1) return null
    return this.findSubmissionForTeacher(submissionId, teacherId)
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

  public async getDailyActivityLogsForClassInSchool(classId: number, schoolId: number, logDate: string, limit = 200) {
    return await this.db
      .select({
        studentUserId: schema.users.id,
        studentIdNum: schema.studentProfiles.studentIdNum,
        fullName: schema.studentProfiles.fullName,
        logId: schema.dailyActivityLogs.id,
        logDate: schema.dailyActivityLogs.logDate,
        warmupCompleted: schema.dailyActivityLogs.warmupCompleted,
        curlUpReps: schema.dailyActivityLogs.curlUpReps,
        cardioDurationMinutes: schema.dailyActivityLogs.cardioDurationMinutes,
        cardioPulseOrReps: schema.dailyActivityLogs.cardioPulseOrReps,
        pushUpReps: schema.dailyActivityLogs.pushUpReps,
        sitReachCm: schema.dailyActivityLogs.sitReachCm,
      })
      .from(schema.classes)
      .innerJoin(schema.classStudents, eq(schema.classStudents.classId, schema.classes.id))
      .innerJoin(schema.users, eq(schema.classStudents.studentId, schema.users.id))
      .innerJoin(schema.studentProfiles, eq(schema.users.id, schema.studentProfiles.userId))
      .leftJoin(
        schema.dailyActivityLogs,
        and(
          eq(schema.dailyActivityLogs.studentId, schema.classStudents.studentId),
          eq(schema.dailyActivityLogs.logDate, logDate),
        ),
      )
      .where(
        and(
          eq(schema.classes.id, classId),
          eq(schema.classes.schoolId, schoolId),
          eq(schema.classes.status, 'active'),
          eq(schema.classStudents.status, 'active'),
          eq(schema.users.role, 'student'),
          eq(schema.users.status, 'active'),
          eq(schema.studentProfiles.schoolId, schoolId),
        ),
      )
      .orderBy(asc(schema.studentProfiles.fullName), desc(schema.dailyActivityLogs.createdAt))
      .limit(limit)
  }
}
