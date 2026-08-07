import { Hono } from 'hono'
import type { AppEnv } from '@/app/Env'
import { ReportController } from '@/app/Controllers/ReportController'
import { authMiddleware, requireRole } from '@/app/Middleware/AuthMiddleware'

const reportRouter = new Hono<AppEnv>()

reportRouter.use('*', authMiddleware, requireRole(['teacher', 'admin']))

reportRouter.get('/class/:classId', (c) => ReportController.getClassReport(c))

export default reportRouter
