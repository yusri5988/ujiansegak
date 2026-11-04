import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

type RequestTarget = 'json' | 'param' | 'query'

export function requestValidator<Target extends RequestTarget, Schema extends z.ZodTypeAny>(
  target: Target,
  schema: Schema,
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          message: 'Maklumat permintaan tidak sah.',
          errors: z.flattenError(result.error).fieldErrors,
        },
        422,
      )
    }
  })
}
