import { z } from 'zod'

export const createAssessmentSessionSchema = z.object({
  schoolId: z.number(),
  academicSessionId: z.number(),
  classId: z.number(),
  title: z.string().min(1, 'Sila masukkan tajuk sesi penilaian Ujian SEGAK'),
  assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phase: z.enum(['PENGGAL_1', 'PENGGAL_2']),
})

export const recordSegakResultSchema = z.object({
  sessionId: z.number(),
  studentId: z.number(),
  heightCm: z.number().positive('Tinggi mestilah bernilai positif'),
  weightKg: z.number().positive('Berat mestilah bernilai positif'),
  age: z.number().min(7).max(19),
  gender: z.enum(['L', 'P']),
  measurements: z.array(
    z.object({
      activityCode: z.string().min(1),
      rawMeasurement: z.number(),
    })
  ),
  status: z.enum(['draft', 'finalized']).default('draft'),
})
