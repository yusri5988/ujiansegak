import { Hono } from 'hono'
import type { AppEnv } from '@/app/Env'
import { AuthController } from '@/app/Controllers/AuthController'
import { ProfileController } from '@/app/Controllers/ProfileController'
import { authMiddleware } from '@/app/Middleware/AuthMiddleware'
import { loginRequest } from '@/app/Requests/AuthRequests'
import { updatePasswordRequest, updateProfileRequest } from '@/app/Requests/ProfileRequests'

const authRouter = new Hono<AppEnv>()

authRouter.post('/login', loginRequest, (c) => AuthController.login(c, c.req.valid('json')))
authRouter.get('/me', authMiddleware, (c) => AuthController.me(c))
authRouter.post('/logout', authMiddleware, (c) => AuthController.logout(c))

// Profile routes
authRouter.get('/profile', authMiddleware, (c) => ProfileController.getProfile(c))
authRouter.put('/profile', authMiddleware, updateProfileRequest, (c) => ProfileController.updateProfile(c))
authRouter.put('/password', authMiddleware, updatePasswordRequest, (c) =>
  ProfileController.updatePassword(c, c.req.valid('json')),
)

export default authRouter
