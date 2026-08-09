import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

export const createClassSchema = z.object({
  name: z.string().trim().min(1, 'Sila masukkan nama kelas').max(100, 'Nama kelas terlalu panjang'),
  schoolId: z.coerce.number().int().positive().optional(),
  academicSessionId: z.coerce.number().int().positive().optional(),
})

export const createClassRequest = zValidator('json', createClassSchema, (result, c) => {
  if (!result.success) {
    return c.json(
      {
        success: false,
        message: 'Data kelas tidak sah.',
        errors: result.error.flatten().fieldErrors,
      },
      422
    )
  }
})

export type CreateClassInput = z.infer<typeof createClassSchema>

export const createStudentSchema = z.object({
  schoolId: z.number(),
  classId: z.number(),
  studentIdNum: z.string().min(1, 'Sila masukkan No ID / Matrik murid'),
  fullName: z.string().min(1, 'Sila masukkan nama penuh murid'),
  gender: z.enum(['L', 'P']),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tarikh lahir mestilah YYYY-MM-DD'),
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
})

export const importStudentsCsvSchema = z.object({
  schoolId: z.number(),
  classId: z.number(),
  students: z.array(
    z.object({
      studentIdNum: z.string().min(1),
      fullName: z.string().min(1),
      gender: z.enum(['L', 'P']),
      dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  ),
})
