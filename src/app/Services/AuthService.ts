import type { AuthUser } from '@/app/Env'
import { ApiException } from '@/app/Exceptions/ApiException'
import { AuthRepository } from '@/app/Repositories/AuthRepository'
import { AuditRepository } from '@/app/Repositories/AuditRepository'
import { ClassRepository } from '@/app/Repositories/ClassRepository'
import { UserRepository } from '@/app/Repositories/UserRepository'
import { Jwt } from '@/helpers/Jwt'
import { PasswordService } from '@/app/Services/PasswordService'

const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000

export type AuthIdentity = {
  user: AuthUser
  jti: string
}

type AuthProfile = {
  fullName: string
  schoolId: number
  phone?: string | null
  studentIdNum?: string
}

export type AuthUserResource = AuthUser & {
  profile: AuthProfile | null
}

export type AuthLoginResult = {
  token: string
  user: AuthUserResource
}

export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authRepo: AuthRepository,
    private readonly classRepo: ClassRepository,
    private readonly auditRepo: AuditRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtSecret?: string,
  ) {}

  public async login(username: string, password: string): Promise<AuthLoginResult | null> {
    const user = await this.userRepo.findByLoginIdentifier(username)
    if (!user) return null
    if (user.status !== 'active') {
      throw new ApiException(403, 'Akaun anda telah dinyahaktifkan. Sila hubungi pentadbir.')
    }
    if (!(await this.passwordService.verify(password, user.passwordHash))) return null

    if (this.passwordService.needsRehash(user.passwordHash)) {
      await this.userRepo.updatePassword(user.id, await this.passwordService.hash(password))
    }

    const now = new Date()
    const jti = crypto.randomUUID()
    const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS)
    const token = await Jwt.sign(
      { sub: String(user.id), jti, exp: Math.floor(expiresAt.getTime() / 1000) },
      this.requireJwtSecret(),
    )

    const session = await this.authRepo.createSession({
      jti,
      userId: user.id,
      expiresAt,
      revokedAt: null,
      createdAt: now,
    })
    if (!session) throw new ApiException(503, 'Sesi log masuk tidak dapat disimpan.')

    await this.auditRepo.log({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: String(user.id),
      details: `Pengguna ${user.username} log masuk ke dalam sistem.`,
    })

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        profile: await this.getProfileResource(user.id, user.role),
      },
    }
  }

  public async authenticate(token: string): Promise<AuthIdentity | null> {
    const claims = await Jwt.verify(token, this.requireJwtSecret())
    if (!claims) return null

    const userId = Number(claims.sub)
    if (!Number.isSafeInteger(userId) || userId < 1) return null

    const now = new Date()
    const session = await this.authRepo.findActiveSession(claims.jti, userId, now)
    if (!session) return null

    const user = await this.userRepo.findById(userId)
    if (!user || user.status !== 'active') return null

    return {
      user: { id: user.id, username: user.username, role: user.role },
      jti: claims.jti,
    }
  }

  public async getCurrentUser(userId: number): Promise<AuthUserResource | null> {
    const user = await this.userRepo.findById(userId)
    if (!user || user.status !== 'active') return null
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      profile: await this.getProfileResource(user.id, user.role),
    }
  }

  public async logout(userId: number, jti: string) {
    const revoked = await this.authRepo.revokeSession(jti, userId, new Date())
    if (revoked) {
      await this.auditRepo.log({
        userId,
        action: 'LOGOUT',
        entityType: 'USER',
        entityId: String(userId),
        details: 'Pengguna log keluar daripada sistem.',
      })
    }
    return revoked
  }

  public async updatePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.userRepo.findById(userId)
    if (!user || !(await this.passwordService.verify(currentPassword, user.passwordHash))) {
      throw new ApiException(401, 'Kata laluan semasa tidak sah.')
    }

    const updated = await this.authRepo.updatePasswordAndRevokeSessions(
      userId,
      await this.passwordService.hash(newPassword),
      new Date(),
    )
    if (!updated) throw new ApiException(404, 'Pengguna tidak ditemui.')

    await this.auditRepo.log({
      userId,
      action: 'UPDATE_PASSWORD',
      entityType: 'USER',
      entityId: String(userId),
      details: 'Pengguna telah menukar kata laluan.',
    })
  }

  public async resetStudentPassword(actor: AuthUser, studentId: number, newPassword: string) {
    const student = await this.userRepo.findById(studentId)
    if (!student || student.role !== 'student') {
      throw new ApiException(404, 'Murid tidak ditemui.')
    }

    if (actor.role === 'teacher' && !(await this.classRepo.studentBelongsToTeacher(studentId, actor.id))) {
      throw new ApiException(404, 'Murid tidak ditemui.')
    }

    const updated = await this.authRepo.updatePasswordAndRevokeSessions(
      studentId,
      await this.passwordService.hash(newPassword),
      new Date(),
    )
    if (!updated) throw new ApiException(404, 'Murid tidak ditemui.')

    await this.auditRepo.log({
      userId: actor.id,
      action: 'RESET_STUDENT_PASSWORD',
      entityType: 'STUDENT',
      entityId: String(studentId),
      details: `Kata laluan murid ID ${studentId} telah ditetapkan semula oleh guru.`,
    })
  }

  public async resetStudentPasswordForSchool(actor: AuthUser, schoolId: number, studentId: number) {
    const profile = await this.userRepo.getStudentProfileForSchool(studentId, schoolId)
    const student = await this.userRepo.findById(studentId)
    if (!profile || !student || student.role !== 'student') throw new ApiException(404, 'Murid tidak ditemui dalam sekolah ini.')

    const temporaryPassword = this.passwordService.generateTemporaryPassword()
    const updated = await this.authRepo.updatePasswordAndRevokeSessions(
      studentId,
      await this.passwordService.hash(temporaryPassword),
      new Date(),
    )
    if (!updated) throw new ApiException(404, 'Murid tidak ditemui dalam sekolah ini.')

    await this.auditRepo.log({
      userId: actor.id,
      action: 'RESET_STUDENT_PASSWORD',
      entityType: 'STUDENT',
      entityId: String(studentId),
      details: `Kata laluan sementara murid ${profile.studentIdNum} ditetapkan semula dalam sekolah ID ${schoolId}.`,
    })
    return { studentIdNum: profile.studentIdNum, temporaryPassword }
  }

  private async getProfileResource(userId: number, role: AuthUser['role']): Promise<AuthProfile | null> {
    if (role === 'teacher') {
      const profile = await this.userRepo.getTeacherProfile(userId)
      return profile
        ? { fullName: profile.fullName, schoolId: profile.schoolId, phone: profile.phone }
        : null
    }

    if (role === 'student') {
      const profile = await this.userRepo.getStudentProfile(userId)
      return profile
        ? { fullName: profile.fullName, schoolId: profile.schoolId, studentIdNum: profile.studentIdNum }
        : null
    }

    return null
  }

  private requireJwtSecret() {
    if (!this.jwtSecret || new TextEncoder().encode(this.jwtSecret).byteLength < 32) {
      throw new ApiException(503, 'Pengesahan sesi belum dikonfigurasi.')
    }
    return this.jwtSecret
  }
}
