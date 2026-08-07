import { eq, and } from 'drizzle-orm'
import { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/database/schema'

export class SegakRepository {
  private db

  constructor(d1: D1Database) {
    this.db = drizzle(d1, { schema })
  }

  public async getAllActivities() {
    return await this.db.select().from(schema.segakActivities).where(eq(schema.segakActivities.isActive, true))
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

  public async getSessionById(sessionId: number) {
    const results = await this.db
      .select()
      .from(schema.assessmentSessions)
      .where(eq(schema.assessmentSessions.id, sessionId))
      .limit(1)
    return results[0] ?? null
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
