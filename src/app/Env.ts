import { D1Database } from '@cloudflare/workers-types'

export type Bindings = {
  DB: D1Database
  APP_NAME?: string
  CORS_ORIGIN?: string
  JWT_SECRET?: string
}

export type AuthUser = {
  id: number
  username: string
  role: 'admin' | 'teacher' | 'student'
}

export type Variables = {
  user?: AuthUser
}

export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
