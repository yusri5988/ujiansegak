import { Context } from 'hono'
import type { AppEnv } from '@/app/Env'
import {
  segakRepoFrom,
  bmiServiceFrom,
  segakScoringServiceFrom,
  auditRepoFrom,
  userRepoFrom,
} from '@/app/Services/AppServiceProvider'

export class SegakController {
  public static async getActivities(c: Context<AppEnv>) {
    const segakRepo = segakRepoFrom(c.env)
    const activities = await segakRepo.getAllActivities()
    return c.json({ success: true, data: activities })
  }

  public static async createSession(c: Context<AppEnv>) {
    const user = c.get('user')!
    const { schoolId, academicSessionId, classId, title, assessmentDate, phase } = await c.req.json()

    const segakRepo = segakRepoFrom(c.env)
    const auditRepo = auditRepoFrom(c.env)

    const session = await segakRepo.createSession({
      schoolId,
      academicSessionId,
      classId,
      teacherId: user.id,
      title,
      assessmentDate,
      phase,
      status: 'active',
    })

    await auditRepo.log({
      userId: user.id,
      action: 'CREATE_SEGAK_SESSION',
      entityType: 'SEGAK_SESSION',
      entityId: String(session.id),
      details: `Sesi Penilaian SEGAK "${title}" dicipta.`,
    })

    return c.json({ success: true, data: session })
  }

  public static async getSessions(c: Context<AppEnv>) {
    const user = c.get('user')!
    const segakRepo = segakRepoFrom(c.env)
    const sessions = await segakRepo.getSessionsByTeacher(user.id)
    return c.json({ success: true, data: sessions })
  }

  public static async recordResult(c: Context<AppEnv>) {
    const user = c.get('user')!
    const { sessionId, studentId, heightCm, weightKg, age, gender, measurements, status } = await c.req.json()

    const segakRepo = segakRepoFrom(c.env)
    const bmiService = bmiServiceFrom()
    const scoringService = segakScoringServiceFrom()
    const auditRepo = auditRepoFrom(c.env)

    const calculatedBmi = bmiService.calculateBmi(heightCm, weightKg)
    const bmiCategory = bmiService.determineBmiCategory(calculatedBmi, age, gender)

    const calculatedItems = []
    for (const item of measurements) {
      if (item.activityCode === 'BMI') {
        calculatedItems.push({
          activityCode: 'BMI',
          rawMeasurement: calculatedBmi,
          calculatedScore: 0,
          performanceCategory: bmiCategory,
        })
      } else {
        const rules = await segakRepo.getScoringRulesForActivity(item.activityCode, gender, age)
        const { score, category } = scoringService.calculateActivityScore(item.rawMeasurement, rules)
        calculatedItems.push({
          activityCode: item.activityCode,
          rawMeasurement: item.rawMeasurement,
          calculatedScore: score,
          performanceCategory: category,
        })
      }
    }

    const overall = scoringService.calculateOverallResult(calculatedItems)

    const resultId = await segakRepo.saveAssessmentResult(
      {
        sessionId,
        studentId,
        heightCm,
        weightKg,
        calculatedBmi,
        bmiCategory,
        totalScore: overall.totalScore,
        overallGrade: overall.overallGrade,
        status: status || 'draft',
        createdBy: user.id,
      },
      overall.items
    )

    await auditRepo.log({
      userId: user.id,
      action: 'RECORD_SEGAK_RESULT',
      entityType: 'SEGAK_RESULT',
      entityId: String(resultId),
      details: `Keputusan SEGAK murid ID ${studentId} direkodkan.`,
    })

    return c.json({
      success: true,
      data: {
        resultId,
        calculatedBmi,
        bmiCategory,
        totalScore: overall.totalScore,
        overallGrade: overall.overallGrade,
        items: overall.items,
      },
    })
  }

  public static async getSessionResults(c: Context<AppEnv>) {
    const sessionId = Number(c.req.param('sessionId'))
    const segakRepo = segakRepoFrom(c.env)
    const results = await segakRepo.getResultsBySession(sessionId)
    return c.json({ success: true, data: results })
  }

  public static async getStudentResults(c: Context<AppEnv>) {
    const user = c.get('user')!
    const segakRepo = segakRepoFrom(c.env)
    const userRepo = userRepoFrom(c.env)

    const profile = await userRepo.getStudentProfile(user.id)
    const results = await segakRepo.getResultsForStudent(user.id)

    return c.json({
      success: true,
      profile,
      data: results,
    })
  }
}
