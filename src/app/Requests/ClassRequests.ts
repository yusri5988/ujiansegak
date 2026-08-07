import { z } from 'zod'

export const createClassSchema = z.object({
  schoolId: z.number(),
  academicSessionId: z.number(),
  name: z.string().min(1, 'Sila masukkan nama kelas'),
  teacherId: z.number().optional(),
})

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
