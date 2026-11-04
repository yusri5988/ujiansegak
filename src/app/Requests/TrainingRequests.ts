import { z } from 'zod'
import { requestValidator } from '@/app/Requests/RequestValidator'

export const createTrainingTemplateSchema = z.object({
  title: z.string().min(1, 'Sila masukkan tajuk templat latihan'),
  description: z.string().optional(),
  objective: z.string().optional(),
  category: z.string().min(1, 'Sila pilih kategori latihan'),
  estimatedDuration: z.number().optional(),
  difficulty: z.enum(['mudah', 'sederhana', 'tinggi']).default('sederhana'),
  sets: z.number().default(3),
  reps: z.number().default(10),
  restSeconds: z.number().default(60),
  videoUrl: z.string().optional(),
  safetyNotes: z.string().optional(),
})

export const updateTrainingTemplateSchema = createTrainingTemplateSchema
export type TrainingTemplateInput = z.infer<typeof createTrainingTemplateSchema>

const youtubeVideoUrlSchema = z
  .string()
  .trim()
  .url('Sila masukkan pautan video yang sah.')
  .refine((value) => {
    try {
      const parsedUrl = new URL(value)
      return (
        parsedUrl.protocol === 'https:' &&
        ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(
          parsedUrl.hostname.toLowerCase(),
        )
      )
    } catch {
      return false
    }
  }, 'Pautan video mestilah daripada YouTube.')

const trainingScheduleSchema = z.object({
  classId: z.number().int().positive(),
  title: z.string().trim().min(1, 'Sila masukkan tajuk latihan').max(160),
  trainingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Sila masukkan tarikh latihan yang sah.')
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`)
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    }, 'Sila masukkan tarikh latihan yang sah.'),
  instructions: z.string().trim().max(2000).optional(),
  evidenceRequired: z.boolean().default(false),
  teacherNotes: z.string().trim().max(2000).optional(),
  activities: z
    .array(
      z.object({
        templateId: z.number().int().positive().optional(),
        title: z.string().trim().min(1).max(160),
        sets: z.number().int().min(1).default(1),
        reps: z.number().int().min(0).nullable().optional(),
        videoUrl: youtubeVideoUrlSchema,
      }),
    )
    .length(1, 'Setiap jadual mesti mengandungi satu aktiviti sahaja.'),
})

export const createTrainingScheduleSchema = trainingScheduleSchema
export const updateTrainingScheduleSchema = trainingScheduleSchema
export const trainingScheduleIdSchema = z.object({ id: z.coerce.number().int().positive() })

export type TrainingScheduleInput = z.infer<typeof trainingScheduleSchema>
export type TrainingScheduleIdInput = z.infer<typeof trainingScheduleIdSchema>

export const createTrainingScheduleRequest = requestValidator('json', createTrainingScheduleSchema)
export const updateTrainingScheduleRequest = requestValidator('json', updateTrainingScheduleSchema)
export const trainingScheduleIdRequest = requestValidator('param', trainingScheduleIdSchema)

export const submitTrainingSchema = z.object({
  assignmentId: z.number().int().positive(),
  scheduleId: z.number().int().positive(),
  durationMinutes: z.number().int().nonnegative().optional(),
  setsCompleted: z.number().int().nonnegative().optional(),
  repsCompleted: z.number().int().nonnegative().optional(),
  studentNotes: z.string().trim().max(2000).optional(),
  evidenceFiles: z.array(z.string()).optional(),
})
export type SubmitTrainingInput = z.infer<typeof submitTrainingSchema>
export const submitTrainingRequest = requestValidator('json', submitTrainingSchema)

export const reviewSubmissionSchema = z.object({
  submissionId: z.number(),
  reviewStatus: z.enum(['approved', 'needs_correction', 'rejected']),
  teacherFeedback: z.string().optional(),
})
