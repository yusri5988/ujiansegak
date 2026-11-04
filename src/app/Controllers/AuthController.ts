import { Context } from 'hono'
import type { AppEnv } from '@/app/Env'
import { authServiceFrom } from '@/app/Services/AppServiceProvider'
import type { LoginInput } from '@/app/Requests/AuthRequests'

export class AuthController {
  public static async login(c: Context<AppEnv>, input: LoginInput) {
    const { username, password } = input
    const result = await authServiceFrom(c.env).login(username, password)
    if (!result) {
      return c.json({ success: false, message: 'ID/Emel atau kata laluan tidak sah' }, 401)
    }
    return c.json({
      success: true,
      token: result.token,
      user: result.user,
    })
  }

  public static async me(c: Context<AppEnv>) {
    const authUser = c.get('user')
    if (!authUser) {
      return c.json({ success: false, message: 'Tidak diotentikasi' }, 401)
    }

    const user = await authServiceFrom(c.env).getCurrentUser(authUser.id)
    if (!user) {
      return c.json({ success: false, message: 'Pengguna tidak ditemui' }, 404)
    }

    return c.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        profile: user.profile,
      },
    })
  }

  public static async logout(c: Context<AppEnv>) {
    const user = c.get('user')
    const jti = c.get('sessionJti')
    if (!user || !jti) return c.json({ success: false, message: 'Sesi tidak sah.' }, 401)

    await authServiceFrom(c.env).logout(user.id, jti)
    return c.json({ success: true, message: 'Anda telah log keluar.' })
  }
}
