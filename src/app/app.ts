import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { AppEnv } from '@/app/Env'
import { requestId } from '@/app/Middleware/Global'
import { notFound } from '@/app/Exceptions/HttpException'
import { onError } from '@/app/Exceptions/Handler'
import api from '@/routes/api'

const app = new Hono<AppEnv>()

app.use('*', logger())
app.use('*', requestId)
app.use('/api/*', (c, next) => cors({ origin: c.env?.CORS_ORIGIN ?? 'http://localhost:5173' })(c, next))

app.route('/api', api)
app.get('/health', (c) => c.json({ status: 'ok', app: 'Sistem Pengurusan Ujian SEGAK' }))

app.notFound(notFound)
app.onError(onError)

export default app
