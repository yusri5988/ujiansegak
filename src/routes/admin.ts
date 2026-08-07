import { Hono } from 'hono'
import type { AppEnv } from '@/app/Env'
import { AdminController } from '@/app/Controllers/AdminController'
import { authMiddleware, requireRole } from '@/app/Middleware/AuthMiddleware'

const adminRouter = new Hono<AppEnv>()

adminRouter.use('*', authMiddleware, requireRole(['admin']))

adminRouter.get('/schools', (c) => AdminController.getSchools(c))
adminRouter.post('/schools', (c) => AdminController.createSchool(c))
adminRouter.post('/teachers', (c) => AdminController.createTeacher(c))
adminRouter.get('/stats', (c) => AdminController.getStats(c))

export default adminRouter
