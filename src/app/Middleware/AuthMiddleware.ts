import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '@/app/Env'
import { authServiceFrom } from '@/app/Services/AppServiceProvider'

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ message: 'Akses tidak dibenarkan. Sila log masuk.' }, 401)
  }

  const token = authHeader.slice('Bearer '.length).trim()
  const identity = await authServiceFrom(c.env).authenticate(token)
  if (!identity) return c.json({ message: 'Sesi anda telah tamat atau tidak sah.' }, 401)

  c.set('user', identity.user)
  c.set('sessionJti', identity.jti)

  await next()
})

export const requireRole = (roles: Array<'admin' | 'teacher' | 'student'>) => {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user')
    if (!user || !roles.includes(user.role)) {
      return c.json({ message: 'Anda tidak mempunyai kebenaran untuk akses fungsi ini.' }, 403)
    }
    await next()
  })
}
