import { z } from 'zod'
import { requestValidator } from '@/app/Requests/RequestValidator'

export const aiChatSchema = z.object({
  message: z.string().trim().min(1, 'Taip mesej untuk dihantar.').max(4000, 'Mesej terlalu panjang.'),
  conversationId: z.string().uuid().optional(),
})

export const aiResourceIdSchema = z.object({ id: z.string().uuid() })

export const aiChatRequest = requestValidator('json', aiChatSchema)
export const aiResourceIdRequest = requestValidator('param', aiResourceIdSchema)

export type AiChatInput = z.infer<typeof aiChatSchema>
export type AiResourceIdInput = z.infer<typeof aiResourceIdSchema>
