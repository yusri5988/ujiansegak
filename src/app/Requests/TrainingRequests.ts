import { z } from 'zod'

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

export const createTrainingScheduleSchema = z.object({
  classId: z.number(),
  title: z.string().min(1, 'Sila masukkan tajuk jadual latihan'),
  trainingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  instructions: z.string().optional(),
  evidenceRequired: z.boolean().default(false),
  teacherNotes: z.string().optional(),
  activities: z.array(
    z.object({
      templateId: z.number().optional(),
      title: z.string().min(1),
      sets: z.number().default(3),
      reps: z.number().default(10),
      videoUrl: z.string().optional(),
    })
  ),
})

export const submitTrainingSchema = z.object({
  assignmentId: z.number(),
  scheduleId: z.number(),
  durationMinutes: z.number().optional(),
  setsCompleted: z.number().optional(),
  repsCompleted: z.number().optional(),
  studentNotes: z.string().optional(),
  evidenceFiles: z.array(z.string()).optional(),
})

export const reviewSubmissionSchema = z.object({
  submissionId: z.number(),
  reviewStatus: z.enum(['approved', 'needs_correction', 'rejected']),
  teacherFeedback: z.string().optional(),
})
