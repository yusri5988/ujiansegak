import { Hono } from 'hono'
import type { AppEnv } from '@/app/Env'
import { AiChatController } from '@/app/Controllers/AiChatController'
import { authMiddleware, requireRole } from '@/app/Middleware/AuthMiddleware'
import { noStore } from '@/app/Middleware/Global'
import { aiChatRequest, aiResourceIdRequest } from '@/app/Requests/AiChatRequests'

const aiRouter = new Hono<AppEnv>()

aiRouter.use('*', noStore, authMiddleware, requireRole(['teacher']))

aiRouter.post('/chat', aiChatRequest, (c) => AiChatController.chat(c, c.req.valid('json')))
aiRouter.get('/conversations', (c) => AiChatController.listConversations(c))
aiRouter.get('/conversations/:id', aiResourceIdRequest, (c) =>
  AiChatController.getConversation(c, c.req.valid('param')),
)
aiRouter.delete('/conversations/:id', aiResourceIdRequest, (c) =>
  AiChatController.deleteConversation(c, c.req.valid('param')),
)
aiRouter.post('/actions/:id/confirm', aiResourceIdRequest, (c) =>
  AiChatController.confirmAction(c, c.req.valid('param')),
)
aiRouter.post('/actions/:id/cancel', aiResourceIdRequest, (c) =>
  AiChatController.cancelAction(c, c.req.valid('param')),
)

export default aiRouter
