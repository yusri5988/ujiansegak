import { ConflictException } from '@/app/Exceptions/ConflictException'
import { NotFoundException } from '@/app/Exceptions/NotFoundException'
import { ValidationException } from '@/app/Exceptions/ValidationException'
import type { AuthUser } from '@/app/Env'
import { AuditRepository } from '@/app/Repositories/AuditRepository'
import { ClassRepository } from '@/app/Repositories/ClassRepository'
import { SchoolRepository } from '@/app/Repositories/SchoolRepository'
import { SegakRepository } from '@/app/Repositories/SegakRepository'
import { UserRepository } from '@/app/Repositories/UserRepository'
import { BmiCalculationService } from '@/app/Services/BmiCalculationService'
import { SegakScoringService } from '@/app/Services/SegakScoringService'

export type CreateSchoolSegakSessionInput = {
  classId: number
  academicSessionId: number
  title: string
  assessmentDate: string
  phase: 'PENGGAL_1' | 'PENGGAL_2'
}

export type RecordSchoolSegakResultInput = {
  sessionId: number
  studentIdNum: string
  heightCm: number
  weightKg: number
  measurements: Array<{ activityCode: string; rawMeasurement: number }>
  status: 'draft' | 'finalized'
}

export class SegakService {
  constructor(
    private readonly segakRepo: SegakRepository,
    private readonly classRepo: ClassRepository,
    private readonly schoolRepo: SchoolRepository,
    private readonly userRepo: UserRepository,
    private readonly bmiService: BmiCalculationService,
    private readonly scoringService: SegakScoringService,
    private readonly auditRepo: AuditRepository,
  ) {}

  public async createSessionForSchool(user: AuthUser, schoolId: number, input: CreateSchoolSegakSessionInput) {
    const targetClass = await this.classRepo.findByIdForSchool(input.classId, schoolId)
    if (!targetClass || targetClass.status !== 'active') throw new NotFoundException('Kelas')

    const academicSession = await this.schoolRepo.findAcademicSession(schoolId, input.academicSessionId)
    if (!academicSession || targetClass.academicSessionId !== academicSession.id) {
      throw new ValidationException({ academicSessionId: ['Sesi akademik tidak sepadan dengan kelas ini.'] })
    }

    const session = await this.segakRepo.createSession({
      schoolId,
      academicSessionId: input.academicSessionId,
      classId: input.classId,
      teacherId: user.id,
      title: input.title,
      assessmentDate: input.assessmentDate,
      phase: input.phase,
      status: 'active',
    })

    await this.auditRepo.log({
      userId: user.id,
      action: 'AI_CREATE_SEGAK_SESSION',
      entityType: 'SEGAK_SESSION',
      entityId: String(session.id),
      details: `Sesi SEGAK "${input.title}" dicipta untuk kelas ${targetClass.name}.`,
    })
    return session
  }

  public async recordResultForSchool(
    user: AuthUser,
    schoolId: number,
    input: RecordSchoolSegakResultInput,
    requestId: string,
  ) {
    const session = await this.segakRepo.getSessionByIdForSchool(input.sessionId, schoolId)
    if (!session) throw new NotFoundException('Sesi SEGAK')
    if (session.status === 'locked' || session.status === 'completed') {
      throw new ConflictException('Sesi SEGAK yang telah ditutup tidak boleh diubah.')
    }

    const student = await this.userRepo.getStudentProfileByStudentIdNum(schoolId, input.studentIdNum)
    if (!student || !(await this.segakRepo.studentBelongsToSessionClass(session.id, student.userId, schoolId))) {
      throw new NotFoundException('Murid dalam kelas sesi SEGAK')
    }

    const age = SegakService.ageOn(student.dob, session.assessmentDate)
    if (!Number.isInteger(age) || age < 7 || age > 19) throw new ValidationException({ studentIdNum: ['Tarikh lahir atau umur murid tidak sah untuk penilaian.'] })

    const activities = await this.segakRepo.getAllActivities()
    const applicable = activities.filter((activity) =>
      activity.code !== 'BMI' &&
      (activity.genderApplicability === 'ALL' || activity.genderApplicability === student.gender) &&
      age >= (activity.minAge ?? 0) && age <= (activity.maxAge ?? 120),
    )
    const codes = input.measurements.map((measurement) => measurement.activityCode)
    const requiredCodes = new Set(applicable.map((activity) => activity.code))
    if (new Set(codes).size !== codes.length || codes.some((code) => !requiredCodes.has(code))) {
      throw new ValidationException({ measurements: ['Kod aktiviti mesti sah dan tidak boleh berulang. BMI dikira secara automatik.'] })
    }
    const missing = applicable.filter((activity) => !codes.includes(activity.code))
    if (missing.length > 0) {
      throw new ValidationException({ measurements: [`Ukuran belum lengkap: ${missing.map((activity) => activity.code).join(', ')}.`] })
    }

    const calculatedBmi = this.bmiService.calculateBmi(input.heightCm, input.weightKg)
    const bmiCategory = this.bmiService.determineBmiCategory(calculatedBmi, age, student.gender)
    const calculatedItems = [{ activityCode: 'BMI', rawMeasurement: calculatedBmi, calculatedScore: 0, performanceCategory: bmiCategory }]
    for (const measurement of input.measurements) {
      const rules = await this.segakRepo.getScoringRulesForActivity(measurement.activityCode, student.gender, age)
      if (rules.length === 0) throw new ValidationException({ measurements: [`Peraturan pemarkahan ${measurement.activityCode} untuk murid ini belum tersedia.`] })
      const score = this.scoringService.calculateActivityScore(measurement.rawMeasurement, rules)
      calculatedItems.push({
        activityCode: measurement.activityCode,
        rawMeasurement: measurement.rawMeasurement,
        calculatedScore: score.score,
        performanceCategory: score.category,
      })
    }

    const overall = this.scoringService.calculateOverallResult(calculatedItems)
    const resultId = await this.segakRepo.saveAssessmentResultForSchool(
      schoolId,
      {
        sessionId: session.id,
        studentId: student.userId,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        calculatedBmi,
        bmiCategory,
        totalScore: overall.totalScore,
        overallGrade: overall.overallGrade,
        status: input.status,
        createdBy: user.id,
        updatedBy: user.id,
        creationRequestId: requestId,
      },
      overall.items,
    )
    if (!resultId) throw new ConflictException('Keputusan ini sudah dimuktamadkan atau tidak dapat dikemas kini.')

    await this.auditRepo.log({
      userId: user.id,
      action: 'AI_RECORD_SEGAK_RESULT',
      entityType: 'SEGAK_RESULT',
      entityId: String(resultId),
      details: `Keputusan SEGAK untuk murid ${student.studentIdNum} direkodkan dalam sesi ${session.title}.`,
    })
    return {
      resultId,
      studentIdNum: student.studentIdNum,
      fullName: student.fullName,
      calculatedBmi,
      bmiCategory,
      totalScore: overall.totalScore,
      overallGrade: overall.overallGrade,
      status: input.status,
      items: overall.items,
    }
  }

  public async updateSessionStatusForSchool(
    user: AuthUser,
    schoolId: number,
    sessionId: number,
    status: 'completed' | 'locked',
  ) {
    const session = await this.segakRepo.getSessionByIdForSchool(sessionId, schoolId)
    if (!session) throw new NotFoundException('Sesi SEGAK')
    if (session.status === 'locked' || session.status === 'completed') {
      throw new ConflictException('Sesi SEGAK telah ditutup.')
    }
    if (status === 'locked' && (await this.segakRepo.hasDraftResultsForSession(sessionId, schoolId))) {
      throw new ConflictException('Selesaikan atau muktamadkan semua keputusan draf sebelum mengunci sesi.')
    }
    const updated = await this.segakRepo.updateSessionStatusForSchool(sessionId, schoolId, status)
    if (!updated) throw new NotFoundException('Sesi SEGAK')
    await this.auditRepo.log({
      userId: user.id,
      action: 'AI_UPDATE_SEGAK_SESSION_STATUS',
      entityType: 'SEGAK_SESSION',
      entityId: String(sessionId),
      details: `Sesi SEGAK "${session.title}" ditukar kepada status ${status}.`,
    })
    return updated
  }

  private static ageOn(dateOfBirth: string, referenceDate: string) {
    const birth = new Date(`${dateOfBirth}T00:00:00Z`)
    const reference = new Date(`${referenceDate}T00:00:00Z`)
    let age = reference.getUTCFullYear() - birth.getUTCFullYear()
    const beforeBirthday =
      reference.getUTCMonth() < birth.getUTCMonth() ||
      (reference.getUTCMonth() === birth.getUTCMonth() && reference.getUTCDate() < birth.getUTCDate())
    if (beforeBirthday) age -= 1
    return age
  }
}
