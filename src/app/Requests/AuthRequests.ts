import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, 'Sila masukkan ID / Emel pengguna'),
  password: z.string().min(1, 'Sila masukkan kata laluan'),
})

export const resetPasswordSchema = z.object({
  userId: z.number(),
  newPassword: z.string().min(6, 'Kata laluan mestilah sekurang-kurangnya 6 aksara'),
})
