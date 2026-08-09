import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Sila masukkan nama penuh.'),
  phone: z.string().trim().optional().default(''),
  email: z.string().trim().email('Sila masukkan alamat email yang sah.'),
})

export const updateProfileRequest = zValidator('json', updateProfileSchema)

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
