import { Context } from 'hono'
import type { AppEnv } from '@/app/Env'
import { schoolRepoFrom, userRepoFrom, auditRepoFrom } from '@/app/Services/AppServiceProvider'
import { Hash } from '@/helpers/Hash'

export class AdminController {
  public static async getSchools(c: Context<AppEnv>) {
    const schoolRepo = schoolRepoFrom(c.env)
    const schools = await schoolRepo.findAll()
    return c.json({ success: true, data: schools })
  }

  public static async createSchool(c: Context<AppEnv>) {
    const { name, code, address, state } = await c.req.json()
    const schoolRepo = schoolRepoFrom(c.env)
    const school = await schoolRepo.create({ name, code, address, state })
    return c.json({ success: true, data: school })
  }

  public static async createTeacher(c: Context<AppEnv>) {
    const { schoolId, fullName, email, password, phone } = await c.req.json()
    const userRepo = userRepoFrom(c.env)
    const auditRepo = auditRepoFrom(c.env)

    const passwordHash = await Hash.make(password || 'Guru1234!')
    const user = await userRepo.createUser({
      username: email,
      email,
      passwordHash,
      role: 'teacher',
      status: 'active',
    })

    if (!user) throw new Error('Gagal mencipta pengguna guru')

    const profile = await userRepo.createTeacherProfile({
      userId: user.id,
      schoolId,
      fullName,
      phone,
    })

    const authUser = c.get('user')
    await auditRepo.log({
      userId: authUser?.id,
      action: 'CREATE_TEACHER',
      entityType: 'TEACHER',
      entityId: String(user.id),
      details: `Guru ${fullName} (${email}) didaftarkan.`,
    })

    return c.json({ success: true, data: { user, profile } })
  }

  public static async getStats(c: Context<AppEnv>) {
    const schoolRepo = schoolRepoFrom(c.env)
    const auditRepo = auditRepoFrom(c.env)

    const schools = await schoolRepo.findAll()
    const logs = await auditRepo.getRecentLogs(10)

    return c.json({
      success: true,
      stats: {
        totalSchools: schools.length,
        recentActivitiesCount: logs.length,
      },
      recentLogs: logs,
    })
  }
}
