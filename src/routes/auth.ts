import { Hono } from 'hono'
import type { AppEnv } from '@/app/Env'
import { AuthController } from '@/app/Controllers/AuthController'
import { authMiddleware } from '@/app/Middleware/AuthMiddleware'

const authRouter = new Hono<AppEnv>()

authRouter.post('/login', (c) => AuthController.login(c))
authRouter.get('/me', authMiddleware, (c) => AuthController.me(c))

export default authRouter
