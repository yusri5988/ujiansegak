import type { AuthUser } from '@/app/Env'
import type { CreateClassInput } from '@/app/Requests/ClassRequests'
import { ValidationException } from '@/app/Exceptions/ValidationException'
import { ClassRepository } from '@/app/Repositories/ClassRepository'
import { SchoolRepository } from '@/app/Repositories/SchoolRepository'
import { UserRepository } from '@/app/Repositories/UserRepository'

export class ClassService {
  constructor(
    private readonly classRepo: ClassRepository,
    private readonly schoolRepo: SchoolRepository,
    private readonly userRepo: UserRepository
  ) {}

  public async createClass(user: AuthUser, input: CreateClassInput) {
    let schoolId = input.schoolId
    let academicSessionId = input.academicSessionId

    if (user.role === 'teacher') {
      const teacherProfile = await this.userRepo.getTeacherProfile(user.id)
      if (!teacherProfile) {
        throw new ValidationException(
          { schoolId: ['Profil guru belum dipautkan kepada sekolah.'] },
          'Akaun guru belum mempunyai sekolah.'
        )
      }

      schoolId = teacherProfile.schoolId
      const currentSession = await this.schoolRepo.findCurrentAcademicSession(schoolId)
      academicSessionId = currentSession?.id
    }

    if (!schoolId) {
      throw new ValidationException({ schoolId: ['Sekolah diperlukan untuk mencipta kelas.'] })
    }

    if (!academicSessionId) {
      throw new ValidationException(
        { academicSessionId: ['Tiada sesi akademik aktif untuk sekolah ini.'] },
        'Sila tetapkan sesi akademik aktif dahulu.'
      )
    }

    const school = await this.schoolRepo.findById(schoolId)
    if (!school) {
      throw new ValidationException({ schoolId: ['Sekolah tidak ditemui.'] })
    }

    const academicSession = await this.schoolRepo.findAcademicSession(schoolId, academicSessionId)
    if (!academicSession) {
      throw new ValidationException({ academicSessionId: ['Sesi akademik tidak ditemui untuk sekolah ini.'] })
    }

    return this.classRepo.createClass({
      schoolId,
      academicSessionId,
      teacherId: user.id,
      name: input.name,
      status: 'active',
    })
  }
}
