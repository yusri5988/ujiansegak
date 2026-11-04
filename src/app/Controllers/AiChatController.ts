import type { Context } from 'hono'
import type { AppEnv } from '@/app/Env'
import { ApiException } from '@/app/Exceptions/ApiException'
import type { AiChatInput, AiResourceIdInput } from '@/app/Requests/AiChatRequests'
import { aiChatServiceFrom } from '@/app/Services/AppServiceProvider'

export class AiChatController {
  public static async chat(c: Context<AppEnv>, input: AiChatInput) {
    const user = c.get('user')
    if (!user) throw new ApiException(401, 'Sila log masuk.')
    const result = await aiChatServiceFrom(c.env).sendMessage(user, input.message, input.conversationId)
    return c.json({ data: result }, input.conversationId ? 200 : 201)
  }

  public static async listConversations(c: Context<AppEnv>) {
    const user = c.get('user')
    if (!user) throw new ApiException(401, 'Sila log masuk.')
    const { conversations, total } = await aiChatServiceFrom(c.env).listConversations(user)
    return c.json({ data: conversations, meta: { page: 1, perPage: 20, total } })
  }

  public static async getConversation(c: Context<AppEnv>, params: AiResourceIdInput) {
    const user = c.get('user')
    if (!user) throw new ApiException(401, 'Sila log masuk.')
    const data = await aiChatServiceFrom(c.env).getConversation(user, params.id)
    return c.json({ data })
  }

  public static async deleteConversation(c: Context<AppEnv>, params: AiResourceIdInput) {
    const user = c.get('user')
    if (!user) throw new ApiException(401, 'Sila log masuk.')
    await aiChatServiceFrom(c.env).deleteConversation(user, params.id)
    return c.body(null, 204)
  }

  public static async confirmAction(c: Context<AppEnv>, params: AiResourceIdInput) {
    const user = c.get('user')
    if (!user) throw new ApiException(401, 'Sila log masuk.')
    const data = await aiChatServiceFrom(c.env).confirmAction(user, params.id)
    return c.json({ data })
  }

  public static async cancelAction(c: Context<AppEnv>, params: AiResourceIdInput) {
    const user = c.get('user')
    if (!user) throw new ApiException(401, 'Sila log masuk.')
    const data = await aiChatServiceFrom(c.env).cancelAction(user, params.id)
    return c.json({ data })
  }
}
