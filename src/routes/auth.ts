import { Hono } from 'hono'
import type { AppEnv } from '@/app/Env'
import { AuthController } from '@/app/Controllers/AuthController'
import { ProfileController } from '@/app/Controllers/ProfileController'
import { authMiddleware } from '@/app/Middleware/AuthMiddleware'
import { updateProfileRequest } from '@/app/Requests/ProfileRequests'

const authRouter = new Hono<AppEnv>()

authRouter.post('/login', (c) => AuthController.login(c))
authRouter.get('/me', authMiddleware, (c) => AuthController.me(c))

// Profile routes
authRouter.get('/profile', authMiddleware, (c) => ProfileController.getProfile(c))
authRouter.put('/profile', authMiddleware, updateProfileRequest, (c) => ProfileController.updateProfile(c))
authRouter.put('/password', authMiddleware, (c) => ProfileController.updatePassword(c))

export default authRouter
