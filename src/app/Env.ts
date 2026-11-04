export type Bindings = Cloudflare.Env

export type AuthUser = {
  id: number
  username: string
  role: 'admin' | 'teacher' | 'student'
}

export type Variables = {
  user?: AuthUser
  sessionJti?: string
}

export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
