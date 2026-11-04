import { z } from 'zod'
import { requestValidator } from './RequestValidator'

/**
 * Requests — Zod schemas mirroring Laravel Form Requests.
 * They validate the request body *before* the controller runs,
 * so `c.req.valid('json')` is fully typed inside handlers.
 */

export const storeUserSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('A valid email is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})

export const storeUserRequest = requestValidator('json', storeUserSchema)

export const createTeacherSchema = z.object({
  schoolId: z.coerce.number().int().positive(),
  fullName: z.string().trim().min(1, 'Sila masukkan nama penuh.'),
  email: z.string().trim().email('Sila masukkan alamat email yang sah.'),
  password: z.string().min(6, 'Kata laluan mestilah sekurang-kurangnya 6 aksara.').optional().or(z.literal('')),
  phone: z.string().optional(),
})

export const createTeacherRequest = requestValidator('json', createTeacherSchema)
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>

export const showUserSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const showUserRequest = requestValidator('param', showUserSchema)

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const loginUserRequest = requestValidator('json', loginUserSchema)

