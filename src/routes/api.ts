import { Hono } from 'hono'
import type { AppEnv } from '@/app/Env'
import authRouter from './auth'
import adminRouter from './admin'
import teacherRouter from './teachers'
import studentRouter from './students'
import segakRouter from './segak'
import reportRouter from './reports'
import aiRouter from './ai'

const api = new Hono<AppEnv>()

api.get('/health', (c) => c.json({ status: 'ok', app: 'Sistem Pengurusan Ujian SEGAK' }))

api.route('/auth', authRouter)
api.route('/admin', adminRouter)
api.route('/teacher', teacherRouter)
api.route('/student', studentRouter)
api.route('/segak', segakRouter)
api.route('/reports', reportRouter)
api.route('/ai', aiRouter)

export default api
