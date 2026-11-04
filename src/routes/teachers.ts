import { Hono } from 'hono'
import type { AppEnv } from '@/app/Env'
import { ClassController } from '@/app/Controllers/ClassController'
import { TrainingController } from '@/app/Controllers/TrainingController'
import { authMiddleware, requireRole } from '@/app/Middleware/AuthMiddleware'
import {
  createClassRequest,
  createStudentRequest,
  importStudentsCsvRequest,
} from '@/app/Requests/ClassRequests'
import { resetPasswordRequest } from '@/app/Requests/AuthRequests'
import {
  createTrainingScheduleRequest,
  trainingScheduleIdRequest,
  updateTrainingScheduleRequest,
} from '@/app/Requests/TrainingRequests'

const teacherRouter = new Hono<AppEnv>()

teacherRouter.use('*', authMiddleware, requireRole(['teacher', 'admin']))

teacherRouter.get('/classes', (c) => ClassController.getTeacherClasses(c))
teacherRouter.post('/classes', createClassRequest, (c) => ClassController.createClass(c, c.req.valid('json')))
teacherRouter.get('/classes/:id/students', (c) => ClassController.getClassStudents(c))
teacherRouter.post('/students', createStudentRequest, (c) =>
  ClassController.addStudent(c, c.req.valid('json')),
)
teacherRouter.post('/students/import-csv', importStudentsCsvRequest, (c) =>
  ClassController.importStudentsCsv(c, c.req.valid('json')),
)
teacherRouter.post('/students/reset-password', resetPasswordRequest, (c) =>
  ClassController.resetStudentPassword(c, c.req.valid('json')),
)

teacherRouter.get('/templates', (c) => TrainingController.getTemplates(c))
teacherRouter.post('/templates', (c) => TrainingController.createTemplate(c))
teacherRouter.get('/schedules', (c) => TrainingController.getTeacherSchedules(c))
teacherRouter.post('/schedules', createTrainingScheduleRequest, (c) =>
  TrainingController.createSchedule(c, c.req.valid('json')),
)
teacherRouter.put('/schedules/:id', trainingScheduleIdRequest, updateTrainingScheduleRequest, (c) =>
  TrainingController.updateSchedule(c, c.req.valid('param'), c.req.valid('json')),
)
teacherRouter.delete('/schedules/:id', trainingScheduleIdRequest, (c) =>
  TrainingController.deleteSchedule(c, c.req.valid('param')),
)
teacherRouter.get('/submissions', (c) => TrainingController.getSubmissionsForTeacher(c))
teacherRouter.post('/submissions/review', (c) => TrainingController.reviewSubmission(c))
teacherRouter.get('/classes/:classId/daily-logs', (c) => TrainingController.getTeacherDailyLogs(c))

export default teacherRouter
