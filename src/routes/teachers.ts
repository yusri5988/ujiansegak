import { Hono } from 'hono'
import type { AppEnv } from '@/app/Env'
import { ClassController } from '@/app/Controllers/ClassController'
import { TrainingController } from '@/app/Controllers/TrainingController'
import { authMiddleware, requireRole } from '@/app/Middleware/AuthMiddleware'
import { createClassRequest } from '@/app/Requests/ClassRequests'

const teacherRouter = new Hono<AppEnv>()

teacherRouter.use('*', authMiddleware, requireRole(['teacher', 'admin']))

teacherRouter.get('/classes', (c) => ClassController.getTeacherClasses(c))
teacherRouter.post('/classes', createClassRequest, (c) => ClassController.createClass(c, c.req.valid('json')))
teacherRouter.get('/classes/:id/students', (c) => ClassController.getClassStudents(c))
teacherRouter.post('/students', (c) => ClassController.addStudent(c))
teacherRouter.post('/students/import-csv', (c) => ClassController.importStudentsCsv(c))
teacherRouter.post('/students/reset-password', (c) => ClassController.resetStudentPassword(c))

teacherRouter.get('/templates', (c) => TrainingController.getTemplates(c))
teacherRouter.post('/templates', (c) => TrainingController.createTemplate(c))
teacherRouter.get('/schedules', (c) => TrainingController.getTeacherSchedules(c))
teacherRouter.post('/schedules', (c) => TrainingController.createSchedule(c))
teacherRouter.get('/submissions', (c) => TrainingController.getSubmissionsForTeacher(c))
teacherRouter.post('/submissions/review', (c) => TrainingController.reviewSubmission(c))
teacherRouter.get('/classes/:classId/daily-logs', (c) => TrainingController.getTeacherDailyLogs(c))

export default teacherRouter
