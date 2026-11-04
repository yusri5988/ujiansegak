import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '@/app/Env'

/**
 * Global middleware, registered once in `src/index.ts`.
 * Order matters — they run in registration order like onion layers.
 */
export const requestId = createMiddleware<AppEnv>(async (c, next) => {
  const id = c.req.header('X-Request-Id') ?? crypto.randomUUID()
  c.header('X-Request-Id', id)
  await next()
})

export const noStore = createMiddleware<AppEnv>(async (c, next) => {
  c.header('Cache-Control', 'no-store')
  await next()
})
