import { Context } from 'hono'
import type { AppEnv } from '@/app/Env'
import { segakRepoFrom, classRepoFrom } from '@/app/Services/AppServiceProvider'

export class ReportController {
  public static async getClassReport(c: Context<AppEnv>) {
    const classId = Number(c.req.param('classId'))
    const sessionId = Number(c.req.query('sessionId'))

    const classRepo = classRepoFrom(c.env)
    const segakRepo = segakRepoFrom(c.env)

    const classStudents = await classRepo.getClassStudents(classId)
    let results: Array<Record<string, unknown>> = []
    if (sessionId) {
      results = await segakRepo.getResultsBySession(sessionId)
    }

    const totalStudents = classStudents.length
    const completedCount = results.length
    const completionRate = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0

    return c.json({
      success: true,
      data: {
        totalStudents,
        completedCount,
        completionRate,
        students: classStudents,
        results,
      },
    })
  }
}
