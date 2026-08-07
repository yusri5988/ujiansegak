import { Context } from 'hono'
import type { AppEnv } from '@/app/Env'
import { userRepoFrom, auditRepoFrom } from '@/app/Services/AppServiceProvider'
import { Hash } from '@/helpers/Hash'

export class AuthController {
  public static async login(c: Context<AppEnv>) {
    const { username, password } = await c.req.json()

    const userRepo = userRepoFrom(c.env)
    const auditRepo = auditRepoFrom(c.env)

    const user = await userRepo.findByUsername(username)
    if (!user) {
      return c.json({ success: false, message: 'ID/Emel atau kata laluan tidak sah' }, 401)
    }

    if (user.status !== 'active') {
      return c.json({ success: false, message: 'Akaun anda telah dinyahaktifkan. Sila hubungi pentadbir.' }, 403)
    }

    const validPassword = await Hash.verify(password, user.passwordHash)
    if (!validPassword) {
      return c.json({ success: false, message: 'ID/Emel atau kata laluan tidak sah' }, 401)
    }

    let profile = null
    if (user.role === 'teacher') {
      profile = await userRepo.getTeacherProfile(user.id)
    } else if (user.role === 'student') {
      profile = await userRepo.getStudentProfile(user.id)
    }

    const token = Hash.generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    })

    await auditRepo.log({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: String(user.id),
      details: `User ${user.username} log masuk ke dalam sistem.`,
    })

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        profile,
      },
    })
  }

  public static async me(c: Context<AppEnv>) {
    const authUser = c.get('user')
    if (!authUser) {
      return c.json({ success: false, message: 'Tidak diotentikasi' }, 401)
    }

    const userRepo = userRepoFrom(c.env)
    const user = await userRepo.findById(authUser.id)
    if (!user) {
      return c.json({ success: false, message: 'Pengguna tidak ditemui' }, 404)
    }

    let profile = null
    if (user.role === 'teacher') {
      profile = await userRepo.getTeacherProfile(user.id)
    } else if (user.role === 'student') {
      profile = await userRepo.getStudentProfile(user.id)
    }

    return c.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        profile,
      },
    })
  }
}
