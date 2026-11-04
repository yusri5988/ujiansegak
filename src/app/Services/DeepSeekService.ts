import { z } from 'zod'
import { ApiException } from '@/app/Exceptions/ApiException'
import { AiProviderException } from '@/app/Exceptions/AiProviderException'
import type { DeepSeekFunctionTool } from '@/app/Services/AiToolService'

const toolCallSchema = z.object({
  id: z.string().min(1),
  type: z.literal('function'),
  function: z.object({ name: z.string().min(1), arguments: z.string() }),
})

const responseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable().optional(),
        tool_calls: z.array(toolCallSchema).optional(),
      }),
    }),
  ).min(1),
})

export type DeepSeekToolCall = z.infer<typeof toolCallSchema>

export type DeepSeekMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: DeepSeekToolCall[] }
  | { role: 'tool'; tool_call_id: string; name: string; content: string }

export class DeepSeekService {
  constructor(
    private readonly apiKey?: string,
    private readonly model = 'deepseek-flash',
  ) {}

  public async complete(messages: DeepSeekMessage[], tools: DeepSeekFunctionTool[]) {
    if (!this.apiKey) throw new ApiException(503, 'Perkhidmatan AI belum dikonfigurasi.')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000)
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          tools,
          tool_choice: 'auto',
          stream: false,
          max_tokens: 1200,
          thinking: { type: 'disabled' },
        }),
        signal: controller.signal,
      })
      if (!response.ok) throw new AiProviderException()

      const parsed = responseSchema.safeParse(await response.json())
      if (!parsed.success) throw new AiProviderException()
      const message = parsed.data.choices[0]?.message
      if (!message) throw new AiProviderException()

      return {
        content: message.content ?? null,
        toolCalls: message.tool_calls ?? [],
      }
    } catch {
      throw new AiProviderException()
    } finally {
      clearTimeout(timeout)
    }
  }
}
