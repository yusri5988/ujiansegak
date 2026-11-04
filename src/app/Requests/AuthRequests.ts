import { z } from 'zod'
import { requestValidator } from './RequestValidator'

export const loginSchema = z.object({
  username: z.string().min(1, 'Sila masukkan ID / Emel pengguna'),
  password: z.string().min(1, 'Sila masukkan kata laluan'),
})

export const loginRequest = requestValidator('json', loginSchema)
export type LoginInput = z.infer<typeof loginSchema>

export const resetPasswordSchema = z.object({
  userId: z.number().int().positive(),
  newPassword: z.string().min(6, 'Kata laluan mestilah sekurang-kurangnya 6 aksara').optional(),
})

export const resetPasswordRequest = requestValidator('json', resetPasswordSchema)
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
