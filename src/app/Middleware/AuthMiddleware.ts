import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '@/app/Env'
import { Hash } from '@/helpers/Hash'

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, message: 'Akses tidak dibenarkan. Sila log masuk.' }, 401)
  }

  const token = authHeader.replace('Bearer ', '').trim()
  const payload = Hash.parseToken(token)
  if (!payload) {
    return c.json({ success: false, message: 'Sesi anda telah tamat atau tidak sah.' }, 401)
  }

  c.set('user', {
    id: payload.userId,
    username: (payload as unknown as { username: string }).username || '',
    role: payload.role as 'admin' | 'teacher' | 'student',
  })

  await next()
})

export const requireRole = (roles: Array<'admin' | 'teacher' | 'student'>) => {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user')
    if (!user || !roles.includes(user.role)) {
      return c.json({ success: false, message: 'Anda tidak mempunyai kebenaran untuk akses fungsi ini.' }, 403)
    }
    await next()
  })
}
