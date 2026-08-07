import { Hono } from 'hono'
import type { AppEnv } from '@/app/Env'
import { TrainingController } from '@/app/Controllers/TrainingController'
import { SegakController } from '@/app/Controllers/SegakController'
import { authMiddleware, requireRole } from '@/app/Middleware/AuthMiddleware'

const studentRouter = new Hono<AppEnv>()

studentRouter.use('*', authMiddleware, requireRole(['student']))

// Tugasan & Penyerahan Latihan Murid
studentRouter.get('/assignments', (c) => TrainingController.getStudentAssignments(c))
studentRouter.post('/submissions', (c) => TrainingController.submitTraining(c))

// Log Latihan Harian Murid (5 Aktiviti SEGAK)
studentRouter.post('/daily-log', (c) => TrainingController.submitDailyLog(c))
studentRouter.get('/daily-log', (c) => TrainingController.getStudentDailyLogs(c))

// Keputusan Ujian SEGAK Murid
studentRouter.get('/segak-results', (c) => SegakController.getStudentResults(c))

export default studentRouter
