import { Hono } from 'hono'
import type { AppEnv } from '@/app/Env'
import { AdminController } from '@/app/Controllers/AdminController'
import { authMiddleware, requireRole } from '@/app/Middleware/AuthMiddleware'
import { createTeacherRequest } from '@/app/Requests/UserRequest'

const adminRouter = new Hono<AppEnv>()

adminRouter.use('*', authMiddleware, requireRole(['admin']))

adminRouter.get('/schools', (c) => AdminController.getSchools(c))
adminRouter.post('/schools', (c) => AdminController.createSchool(c))
adminRouter.post('/teachers', createTeacherRequest, (c) =>
  AdminController.createTeacher(c, c.req.valid('json')),
)
adminRouter.get('/stats', (c) => AdminController.getStats(c))

export default adminRouter
