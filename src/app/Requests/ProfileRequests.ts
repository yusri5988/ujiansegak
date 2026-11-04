import { z } from 'zod'
import { requestValidator } from './RequestValidator'

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Sila masukkan nama penuh.'),
  phone: z.string().trim().optional().default(''),
  email: z.string().trim().email('Sila masukkan alamat email yang sah.'),
})

export const updateProfileRequest = requestValidator('json', updateProfileSchema)

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Sila masukkan kata laluan semasa.'),
  newPassword: z.string().min(6, 'Kata laluan baharu mestilah sekurang-kurangnya 6 aksara.'),
})

export const updatePasswordRequest = requestValidator('json', updatePasswordSchema)
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
