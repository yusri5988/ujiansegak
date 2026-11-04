import { ApiException } from '@/app/Exceptions/ApiException'
import { ConflictException } from '@/app/Exceptions/ConflictException'
import { NotFoundException } from '@/app/Exceptions/NotFoundException'
import type { AuthUser } from '@/app/Env'
import type { StudentProfileChanges } from '@/app/Repositories/UserRepository'
import type { ClassRepository } from '@/app/Repositories/ClassRepository'
import type { SchoolRepository } from '@/app/Repositories/SchoolRepository'
import type { UserRepository } from '@/app/Repositories/UserRepository'
import type { AuditRepository } from '@/app/Repositories/AuditRepository'
import type { ClassService } from '@/app/Services/ClassService'
import type { AuthService } from '@/app/Services/AuthService'
import type { PasswordService } from '@/app/Services/PasswordService'

export type TeacherAiStudentInput = Pick<
  typeof import('@/database/schema').studentProfiles.$inferInsert,
  | 'studentIdNum'
  | 'fullName'
  | 'gender'
  | 'dob'
  | 'heightCm'
  | 'weightKg'
  | 'medicalNotes'
  | 'guardianName'
  | 'guardianPhone'
>

export class TeacherSchoolService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly classRepo: ClassRepository,
    private readonly schoolRepo: SchoolRepository,
    private readonly classService: ClassService,
    private readonly authService: AuthService,
    private readonly auditRepo: AuditRepository,
    private readonly passwordService: PasswordService,
  ) {}

  public async schoolIdFor(user: AuthUser, expectedSchoolId?: number) {
    if (user.role !== 'teacher') throw new ApiException(403, 'Fungsi ini hanya tersedia untuk guru.')
    const profile = await this.userRepo.getTeacherProfile(user.id)
    if (!profile) throw new ApiException(403, 'Profil guru belum dipautkan kepada sekolah.')
    if (expectedSchoolId !== undefined && profile.schoolId !== expectedSchoolId) throw new ApiException(403, 'Skop sekolah telah berubah. Sediakan tindakan baharu.')
    return profile.schoolId
  }

  public async findAcademicSessionForSchool(schoolId: number, academicSessionId: number) {
    return this.schoolRepo.findAcademicSession(schoolId, academicSessionId)
  }

  public async getCurrentAcademicSessionForSchool(schoolId: number) {
    return this.schoolRepo.findCurrentAcademicSession(schoolId)
  }

  public async createClass(user: AuthUser, name: string) {
    const classRow = await this.classService.createClass(user, { name })
    if (!classRow) throw new ApiException(409, 'Kelas tidak dapat dicipta.')
    await this.auditRepo.log({
      userId: user.id,
      action: 'AI_CREATE_CLASS',
      entityType: 'CLASS',
      entityId: String(classRow.id),
      details: `Kelas "${classRow.name}" dicipta melalui pembantu AI.`,
    })
    return { id: classRow.id, name: classRow.name }
  }

  public async updateClass(user: AuthUser, classId: number, name: string) {
    const schoolId = await this.schoolIdFor(user)
    const updated = await this.classRepo.updateClassForSchool(classId, schoolId, name)
    if (!updated) throw new NotFoundException('Kelas')
    await this.auditRepo.log({
      userId: user.id,
      action: 'AI_UPDATE_CLASS',
      entityType: 'CLASS',
      entityId: String(classId),
      details: `Nama kelas dikemas kini kepada "${updated.name}".`,
    })
    return { id: updated.id, name: updated.name }
  }

  public async archiveClass(user: AuthUser, classId: number) {
    const schoolId = await this.schoolIdFor(user)
    const archived = await this.classRepo.archiveClassForSchool(classId, schoolId)
    if (!archived) throw new NotFoundException('Kelas')
    await this.auditRepo.log({
      userId: user.id,
      action: 'AI_ARCHIVE_CLASS',
      entityType: 'CLASS',
      entityId: String(classId),
      details: `Kelas "${archived.name}" diarkibkan.`,
    })
    return { id: archived.id, name: archived.name, status: archived.status }
  }

  public async getStudentProfile(user: AuthUser, studentIdNum: string) {
    const schoolId = await this.schoolIdFor(user)
    return this.userRepo.getStudentProfileByStudentIdNum(schoolId, studentIdNum)
  }

  public async createStudent(user: AuthUser, classId: number, input: TeacherAiStudentInput) {
    const schoolId = await this.schoolIdFor(user)
    const targetClass = await this.classRepo.findByIdForSchool(classId, schoolId)
    if (!targetClass || targetClass.status !== 'active') throw new NotFoundException('Kelas')
    if (await this.userRepo.findByLoginIdentifier(input.studentIdNum)) {
      throw new ConflictException('ID murid itu sudah digunakan.')
    }

    const temporaryPassword = this.passwordService.generateTemporaryPassword()
    const studentId = await this.classRepo.createStudentForSchool(
      classId,
      schoolId,
      input,
      await this.passwordService.hash(temporaryPassword),
    )
    if (!studentId) throw new ConflictException('Murid tidak dapat didaftarkan. Semak kelas dan ID murid.')

    await this.auditRepo.log({
      userId: user.id,
      action: 'AI_CREATE_STUDENT',
      entityType: 'STUDENT',
      entityId: String(studentId),
      details: `Murid ${input.studentIdNum} didaftarkan ke kelas ${targetClass.name}.`,
    })
    return { studentId, studentIdNum: input.studentIdNum, fullName: input.fullName, temporaryPassword }
  }

  public async importStudents(user: AuthUser, classId: number, inputs: TeacherAiStudentInput[], expectedSchoolId: number) {
    const schoolId = await this.schoolIdFor(user, expectedSchoolId)
    const targetClass = await this.classRepo.findByIdForSchool(classId, schoolId)
    if (!targetClass || targetClass.status !== 'active') throw new NotFoundException('Kelas')
    const identifiers = inputs.map((input) => input.studentIdNum)
    if (new Set(identifiers).size !== identifiers.length || (await this.userRepo.findExistingLoginIdentifiers(identifiers)).length > 0) {
      throw new ConflictException('Ada ID murid berulang atau sudah digunakan. Tiada murid diimport.')
    }
    const credentials = await Promise.all(inputs.map(async (profile) => {
      const password = this.passwordService.generateTemporaryPassword()
      return { profile, password, passwordHash: await this.passwordService.hash(password) }
    }))
    let created: boolean
    try {
      created = await this.classRepo.createStudentsForSchool(classId, schoolId, credentials)
    } catch (error) {
      if (error instanceof Error && /unique constraint/i.test(error.message)) {
        throw new ConflictException('Ada ID murid yang sudah digunakan. Tiada murid diimport.')
      }
      throw error
    }
    if (!created) throw new ConflictException('Import tidak dapat diselesaikan. Semak kelas dan ID murid.')
    await this.auditRepo.log({ userId: user.id, action: 'AI_IMPORT_STUDENTS', entityType: 'CLASS', entityId: String(classId), details: `${inputs.length} murid didaftarkan ke kelas ${targetClass.name}.` })
    return credentials.map(({ profile, password }) => ({ studentIdNum: profile.studentIdNum, fullName: profile.fullName, password }))
  }

  public async updateStudentProfile(user: AuthUser, studentIdNum: string, changes: Partial<StudentProfileChanges>) {
    const schoolId = await this.schoolIdFor(user)
    const existing = await this.userRepo.getStudentProfileByStudentIdNum(schoolId, studentIdNum)
    if (!existing) throw new NotFoundException('Murid')
    const updated = await this.userRepo.updateStudentProfileForSchool(schoolId, existing.userId, changes)
    if (!updated) throw new NotFoundException('Murid')
    await this.auditRepo.log({
      userId: user.id,
      action: 'AI_UPDATE_STUDENT_PROFILE',
      entityType: 'STUDENT',
      entityId: String(existing.userId),
      details: `Profil murid ${studentIdNum} dikemas kini melalui pembantu AI.`,
    })
    return updated
  }

  public async dropStudentFromClass(user: AuthUser, classId: number, studentIdNum: string) {
    const schoolId = await this.schoolIdFor(user)
    const targetClass = await this.classRepo.findByIdForSchool(classId, schoolId)
    const student = await this.userRepo.getStudentProfileByStudentIdNum(schoolId, studentIdNum)
    if (!targetClass || !student) throw new NotFoundException('Murid atau kelas')
    const changed = await this.classRepo.dropStudentFromClassForSchool(classId, schoolId, student.userId)
    if (!changed) throw new NotFoundException('Keahlian kelas')
    await this.auditRepo.log({
      userId: user.id,
      action: 'AI_DROP_STUDENT_FROM_CLASS',
      entityType: 'CLASS_STUDENT',
      entityId: `${classId}:${student.userId}`,
      details: `Murid ${studentIdNum} dikeluarkan daripada kelas ${targetClass.name}.`,
    })
    return { studentIdNum, className: targetClass.name, status: 'dropped' as const }
  }

  public async transferStudent(user: AuthUser, fromClassId: number, toClassId: number, studentIdNum: string, expectedSchoolId: number) {
    const schoolId = await this.schoolIdFor(user, expectedSchoolId)
    if (fromClassId === toClassId) throw new ConflictException('Kelas asal dan kelas baharu mesti berbeza.')
    const [source, target, student] = await Promise.all([
      this.classRepo.findByIdForSchool(fromClassId, schoolId),
      this.classRepo.findByIdForSchool(toClassId, schoolId),
      this.userRepo.getStudentProfileByStudentIdNum(schoolId, studentIdNum),
    ])
    if (!source || !target || source.status !== 'active' || target.status !== 'active' || !student) throw new NotFoundException('Murid atau kelas')
    const transferred = await this.classRepo.transferStudentForSchool(fromClassId, toClassId, schoolId, student.userId)
    if (!transferred) throw new ConflictException('Murid tiada dalam kelas asal atau sudah berada dalam kelas baharu.')
    await this.auditRepo.log({ userId: user.id, action: 'AI_TRANSFER_STUDENT', entityType: 'CLASS_STUDENT', entityId: String(student.userId), details: `Murid ${studentIdNum} dipindahkan daripada ${source.name} ke ${target.name}.` })
    return { studentIdNum, fullName: student.fullName, fromClass: source.name, toClass: target.name }
  }

  public async getOwnProfile(user: AuthUser) {
    const schoolId = await this.schoolIdFor(user)
    const [profile, account] = await Promise.all([this.userRepo.getTeacherProfile(user.id), this.userRepo.findById(user.id)])
    if (!profile || !account || profile.schoolId !== schoolId) throw new NotFoundException('Profil guru')
    return { fullName: profile.fullName, phone: profile.phone ?? '', email: account.email ?? account.username }
  }

  public async updateOwnProfile(user: AuthUser, input: { fullName: string; phone: string; email: string }, expectedSchoolId: number) {
    const schoolId = await this.schoolIdFor(user, expectedSchoolId)
    const email = input.email.toLowerCase()
    if (await this.userRepo.emailExists(email, user.id)) throw new ConflictException('Email tersebut telah digunakan oleh akaun lain.')
    const updated = await this.userRepo.updateTeacherProfileForSchool(user.id, schoolId, input.fullName, input.phone, email)
    if (!updated) throw new ConflictException('Profil tidak dapat dikemas kini. Semak sesi dan email.')
    await this.auditRepo.log({ userId: user.id, action: 'AI_UPDATE_TEACHER_PROFILE', entityType: 'TEACHER', entityId: String(user.id), details: 'Profil guru dikemas kini melalui pembantu AI.' })
    return { fullName: input.fullName, phone: input.phone, email }
  }

  public async resetStudentPassword(user: AuthUser, studentIdNum: string) {
    const schoolId = await this.schoolIdFor(user)
    const student = await this.userRepo.getStudentProfileByStudentIdNum(schoolId, studentIdNum)
    if (!student) throw new NotFoundException('Murid')
    const result = await this.authService.resetStudentPasswordForSchool(user, schoolId, student.userId)
    return { ...result, fullName: student.fullName }
  }
}
