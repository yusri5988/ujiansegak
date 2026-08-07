import { Hono } from 'hono'
import type { AppEnv } from '@/app/Env'
import { SegakController } from '@/app/Controllers/SegakController'
import { authMiddleware, requireRole } from '@/app/Middleware/AuthMiddleware'

const segakRouter = new Hono<AppEnv>()

segakRouter.use('*', authMiddleware)

segakRouter.get('/activities', (c) => SegakController.getActivities(c))

segakRouter.post('/sessions', requireRole(['teacher', 'admin']), (c) => SegakController.createSession(c))
segakRouter.get('/sessions', requireRole(['teacher', 'admin']), (c) => SegakController.getSessions(c))
segakRouter.post('/results', requireRole(['teacher', 'admin']), (c) => SegakController.recordResult(c))
segakRouter.get('/sessions/:sessionId/results', requireRole(['teacher', 'admin']), (c) => SegakController.getSessionResults(c))

export default segakRouter
