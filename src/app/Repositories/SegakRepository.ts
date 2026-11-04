import { eq, and, asc, desc, sql } from 'drizzle-orm'
import { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/database/schema'

export class SegakRepository {
  private db
  private readonly d1: D1Database

  constructor(d1: D1Database) {
    this.d1 = d1
    this.db = drizzle(d1, { schema })
  }

  public async getAllActivities(limit = 50) {
    return await this.db
      .select()
      .from(schema.segakActivities)
      .where(eq(schema.segakActivities.isActive, true))
      .orderBy(asc(schema.segakActivities.name), asc(schema.segakActivities.id))
      .limit(limit)
  }

  public async getScoringRulesForActivity(activityCode: string, gender: string, age: number) {
    const validGender = (gender === 'L' || gender === 'P') ? gender : 'ALL'
    return await this.db
      .select()
      .from(schema.segakScoringRules)
      .where(
        and(
          eq(schema.segakScoringRules.activityCode, activityCode),
          eq(schema.segakScoringRules.gender, validGender),
          eq(schema.segakScoringRules.age, age)
        )
      )
  }

  public async createSession(data: typeof schema.assessmentSessions.$inferInsert) {
    const inserted = await this.db.insert(schema.assessmentSessions).values(data).returning()
    const first = inserted[0]
    if (!first) throw new Error('Gagal mencipta sesi penilaian')
    return first
  }

  public async getSessionsByTeacher(teacherId: number) {
    return await this.db
      .select()
      .from(schema.assessmentSessions)
      .where(eq(schema.assessmentSessions.teacherId, teacherId))
  }

  public async getSessionsBySchool(schoolId: number, limit = 100) {
    return await this.db
      .select()
      .from(schema.assessmentSessions)
      .where(eq(schema.assessmentSessions.schoolId, schoolId))
      .orderBy(desc(schema.assessmentSessions.assessmentDate), desc(schema.assessmentSessions.id))
      .limit(limit)
  }

  public async getSessionById(sessionId: number) {
    const results = await this.db
      .select()
      .from(schema.assessmentSessions)
      .where(eq(schema.assessmentSessions.id, sessionId))
      .limit(1)
    return results[0] ?? null
  }

  public async getSessionByIdForSchool(sessionId: number, schoolId: number) {
    const results = await this.db
      .select()
      .from(schema.assessmentSessions)
      .where(and(eq(schema.assessmentSessions.id, sessionId), eq(schema.assessmentSessions.schoolId, schoolId)))
      .limit(1)
    return results[0] ?? null
  }

  public async updateSessionStatusForSchool(sessionId: number, schoolId: number, status: 'completed' | 'locked') {
    const updated = await this.db
      .update(schema.assessmentSessions)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(schema.assessmentSessions.id, sessionId),
          eq(schema.assessmentSessions.schoolId, schoolId),
          eq(schema.assessmentSessions.status, 'active'),
        ),
      )
      .returning()
    return updated[0] ?? null
  }

  public async hasDraftResultsForSession(sessionId: number, schoolId: number) {
    const rows = await this.db
      .select({ id: schema.assessmentResults.id })
      .from(schema.assessmentResults)
      .innerJoin(schema.assessmentSessions, eq(schema.assessmentResults.sessionId, schema.assessmentSessions.id))
      .where(
        and(
          eq(schema.assessmentResults.sessionId, sessionId),
          eq(schema.assessmentResults.status, 'draft'),
          eq(schema.assessmentSessions.schoolId, schoolId),
        ),
      )
      .limit(1)
    return rows.length > 0
  }

  public async saveAssessmentResultForSchool(
    schoolId: number,
    resultData: typeof schema.assessmentResults.$inferInsert,
    itemsData: Array<Omit<typeof schema.assessmentResultItems.$inferInsert, 'resultId'>>,
  ) {
    const creationRequestId = resultData.creationRequestId
    if (!creationRequestId) throw new Error('ID permintaan keputusan SEGAK diperlukan.')

    const existingActionResult = await this.db
      .select({ id: schema.assessmentResults.id })
      .from(schema.assessmentResults)
      .innerJoin(schema.assessmentSessions, eq(schema.assessmentResults.sessionId, schema.assessmentSessions.id))
      .where(
        and(
          eq(schema.assessmentResults.creationRequestId, creationRequestId),
          eq(schema.assessmentSessions.schoolId, schoolId),
        ),
      )
      .limit(1)
    if (existingActionResult[0]) return existingActionResult[0].id

    const nowSeconds = Math.floor(Date.now() / 1000)
    const updateExisting = this.d1
      .prepare(
        `UPDATE assessment_results
         SET creation_request_id = ?, height_cm = ?, weight_kg = ?, calculated_bmi = ?, bmi_category = ?,
             total_score = ?, overall_grade = ?, status = ?, updated_by = ?, updated_at = ?
         WHERE id = (
           SELECT result.id FROM assessment_results result
           INNER JOIN assessment_sessions session ON session.id = result.session_id
           INNER JOIN class_students membership ON membership.class_id = session.class_id AND membership.student_id = result.student_id
           INNER JOIN student_profiles profile ON profile.user_id = result.student_id
           WHERE result.session_id = ? AND result.student_id = ? AND result.status = 'draft'
             AND session.school_id = ? AND session.status NOT IN ('locked', 'completed')
             AND profile.school_id = ? AND membership.status = 'active'
           ORDER BY result.id DESC LIMIT 1
         )`,
      )
      .bind(
        creationRequestId,
        resultData.heightCm,
        resultData.weightKg,
        resultData.calculatedBmi,
        resultData.bmiCategory,
        resultData.totalScore ?? 0,
        resultData.overallGrade ?? null,
        resultData.status ?? 'draft',
        resultData.updatedBy ?? resultData.createdBy,
        nowSeconds,
        resultData.sessionId,
        resultData.studentId,
        schoolId,
        schoolId,
      )

    const insertNew = this.d1
      .prepare(
        `INSERT INTO assessment_results
          (creation_request_id, session_id, student_id, height_cm, weight_kg, calculated_bmi, bmi_category,
           total_score, overall_grade, status, created_by, updated_by, created_at, updated_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM assessment_sessions session
           INNER JOIN class_students membership ON membership.class_id = session.class_id
           INNER JOIN student_profiles profile ON profile.user_id = membership.student_id
           WHERE session.id = ? AND session.school_id = ?
             AND session.status NOT IN ('locked', 'completed')
             AND membership.student_id = ? AND membership.status = 'active'
             AND profile.school_id = ?
         )
           AND NOT EXISTS (
             SELECT 1 FROM assessment_results existing
             WHERE existing.session_id = ? AND existing.student_id = ?
           )`,
      )
      .bind(
        creationRequestId,
        resultData.sessionId,
        resultData.studentId,
        resultData.heightCm,
        resultData.weightKg,
        resultData.calculatedBmi,
        resultData.bmiCategory,
        resultData.totalScore ?? 0,
        resultData.overallGrade ?? null,
        resultData.status ?? 'draft',
        resultData.createdBy,
        resultData.updatedBy ?? resultData.createdBy,
        nowSeconds,
        nowSeconds,
        resultData.sessionId,
        schoolId,
        resultData.studentId,
        schoolId,
        resultData.sessionId,
        resultData.studentId,
      )

    const statements = [
      updateExisting,
      insertNew,
      this.d1
        .prepare(
          `DELETE FROM assessment_result_items
           WHERE result_id = (
             SELECT id FROM assessment_results
             WHERE creation_request_id = ? AND session_id = ? AND student_id = ?
           )`,
        )
        .bind(creationRequestId, resultData.sessionId, resultData.studentId),
      ...itemsData.map((item) =>
        this.d1
          .prepare(
            `INSERT INTO assessment_result_items
              (result_id, activity_code, raw_measurement, calculated_score, performance_category, created_at)
             SELECT id, ?, ?, ?, ?, ? FROM assessment_results
             WHERE creation_request_id = ? AND session_id = ? AND student_id = ?`,
          )
          .bind(
            item.activityCode,
            item.rawMeasurement,
            item.calculatedScore,
            item.performanceCategory ?? null,
            nowSeconds,
            creationRequestId,
            resultData.sessionId,
            resultData.studentId,
          ),
      ),
    ]

    const results = await this.d1.batch(statements)
    if ((results[0]?.meta.changes ?? 0) === 0 && (results[1]?.meta.changes ?? 0) === 0) return null

    const saved = await this.db
      .select({ id: schema.assessmentResults.id })
      .from(schema.assessmentResults)
      .where(eq(schema.assessmentResults.creationRequestId, creationRequestId))
      .limit(1)
    return saved[0]?.id ?? null
  }

  public async studentBelongsToSessionClass(sessionId: number, studentId: number, schoolId: number) {
    const rows = await this.db
      .select({ classStudentId: schema.classStudents.id })
      .from(schema.assessmentSessions)
      .innerJoin(schema.classStudents, eq(schema.assessmentSessions.classId, schema.classStudents.classId))
      .where(
        and(
          eq(schema.assessmentSessions.id, sessionId),
          eq(schema.assessmentSessions.schoolId, schoolId),
          eq(schema.classStudents.studentId, studentId),
          eq(schema.classStudents.status, 'active'),
        ),
      )
      .limit(1)
    return rows.length > 0
  }

  public async saveAssessmentResult(
    resultData: typeof schema.assessmentResults.$inferInsert,
    itemsData: Array<Omit<typeof schema.assessmentResultItems.$inferInsert, 'resultId'>>
  ) {
    const existing = await this.db
      .select()
      .from(schema.assessmentResults)
      .where(
        and(
          eq(schema.assessmentResults.sessionId, resultData.sessionId),
          eq(schema.assessmentResults.studentId, resultData.studentId)
        )
      )
      .limit(1)

    let resultId: number
    if (existing[0]) {
      resultId = existing[0].id
      await this.db
        .update(schema.assessmentResults)
        .set({
          heightCm: resultData.heightCm,
          weightKg: resultData.weightKg,
          calculatedBmi: resultData.calculatedBmi,
          bmiCategory: resultData.bmiCategory,
          totalScore: resultData.totalScore,
          overallGrade: resultData.overallGrade,
          status: resultData.status,
          updatedBy: resultData.createdBy,
          updatedAt: new Date(),
        })
        .where(eq(schema.assessmentResults.id, resultId))

      await this.db
        .delete(schema.assessmentResultItems)
        .where(eq(schema.assessmentResultItems.resultId, resultId))
    } else {
      const inserted = await this.db.insert(schema.assessmentResults).values(resultData).returning()
      const first = inserted[0]
      if (!first) throw new Error('Gagal menyimpan keputusan Ujian SEGAK')
      resultId = first.id
    }

    for (const item of itemsData) {
      await this.db.insert(schema.assessmentResultItems).values({
        resultId,
        ...item,
      })
    }

    return resultId
  }

  public async getResultsBySession(sessionId: number) {
    return await this.db
      .select({
        resultId: schema.assessmentResults.id,
        studentId: schema.assessmentResults.studentId,
        studentIdNum: schema.studentProfiles.studentIdNum,
        studentName: schema.studentProfiles.fullName,
        gender: schema.studentProfiles.gender,
        heightCm: schema.assessmentResults.heightCm,
        weightKg: schema.assessmentResults.weightKg,
        calculatedBmi: schema.assessmentResults.calculatedBmi,
        bmiCategory: schema.assessmentResults.bmiCategory,
        totalScore: schema.assessmentResults.totalScore,
        overallGrade: schema.assessmentResults.overallGrade,
        status: schema.assessmentResults.status,
      })
      .from(schema.assessmentResults)
      .innerJoin(schema.users, eq(schema.assessmentResults.studentId, schema.users.id))
      .innerJoin(schema.studentProfiles, eq(schema.users.id, schema.studentProfiles.userId))
      .where(eq(schema.assessmentResults.sessionId, sessionId))
  }

  public async getResultsBySessionForSchool(sessionId: number, schoolId: number, limit = 100) {
    return await this.db
      .select({
        resultId: schema.assessmentResults.id,
        studentId: schema.assessmentResults.studentId,
        studentIdNum: schema.studentProfiles.studentIdNum,
        studentName: schema.studentProfiles.fullName,
        gender: schema.studentProfiles.gender,
        heightCm: schema.assessmentResults.heightCm,
        weightKg: schema.assessmentResults.weightKg,
        calculatedBmi: schema.assessmentResults.calculatedBmi,
        bmiCategory: schema.assessmentResults.bmiCategory,
        totalScore: schema.assessmentResults.totalScore,
        overallGrade: schema.assessmentResults.overallGrade,
        status: schema.assessmentResults.status,
      })
      .from(schema.assessmentResults)
      .innerJoin(schema.assessmentSessions, eq(schema.assessmentResults.sessionId, schema.assessmentSessions.id))
      .innerJoin(schema.studentProfiles, eq(schema.assessmentResults.studentId, schema.studentProfiles.userId))
      .where(
        and(
          eq(schema.assessmentSessions.id, sessionId),
          eq(schema.assessmentSessions.schoolId, schoolId),
          eq(schema.studentProfiles.schoolId, schoolId),
        ),
      )
      .orderBy(asc(schema.studentProfiles.fullName), asc(schema.assessmentResults.id))
      .limit(limit)
  }

  public async countResultsBySessionForSchool(sessionId: number, schoolId: number) {
    const rows = await this.db
      .select({ count: sql<number>`count(distinct ${schema.assessmentResults.studentId})` })
      .from(schema.assessmentResults)
      .innerJoin(schema.assessmentSessions, eq(schema.assessmentResults.sessionId, schema.assessmentSessions.id))
      .innerJoin(schema.studentProfiles, eq(schema.assessmentResults.studentId, schema.studentProfiles.userId))
      .where(and(eq(schema.assessmentSessions.id, sessionId), eq(schema.assessmentSessions.schoolId, schoolId), eq(schema.studentProfiles.schoolId, schoolId)))
    return rows[0]?.count ?? 0
  }

  public async getResultsForStudent(studentId: number) {
    return await this.db
      .select({
        sessionId: schema.assessmentSessions.id,
        sessionTitle: schema.assessmentSessions.title,
        assessmentDate: schema.assessmentSessions.assessmentDate,
        phase: schema.assessmentSessions.phase,
        heightCm: schema.assessmentResults.heightCm,
        weightKg: schema.assessmentResults.weightKg,
        calculatedBmi: schema.assessmentResults.calculatedBmi,
        bmiCategory: schema.assessmentResults.bmiCategory,
        totalScore: schema.assessmentResults.totalScore,
        overallGrade: schema.assessmentResults.overallGrade,
      })
      .from(schema.assessmentResults)
      .innerJoin(schema.assessmentSessions, eq(schema.assessmentResults.sessionId, schema.assessmentSessions.id))
      .where(eq(schema.assessmentResults.studentId, studentId))
  }
}
