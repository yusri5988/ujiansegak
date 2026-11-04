import { z } from 'zod'
import type { AuthUser } from '@/app/Env'
import { ApiException } from '@/app/Exceptions/ApiException'
import { ClassRepository } from '@/app/Repositories/ClassRepository'
import { UserRepository } from '@/app/Repositories/UserRepository'
import { SegakRepository } from '@/app/Repositories/SegakRepository'
import type { TrainingService } from '@/app/Services/TrainingService'
import { TeacherSchoolService } from '@/app/Services/TeacherSchoolService'
import { SegakService } from '@/app/Services/SegakService'
import {
  createTrainingScheduleSchema,
  createTrainingTemplateSchema,
  updateTrainingScheduleSchema,
  reviewSubmissionSchema,
} from '@/app/Requests/TrainingRequests'
import type { TrainingScheduleInput, TrainingTemplateInput } from '@/app/Requests/TrainingRequests'
import { updateProfileSchema } from '@/app/Requests/ProfileRequests'

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}, 'Tarikh tidak sah.')

const updateScheduleToolSchema = z.object({
  scheduleId: z.number().int().positive(),
  input: updateTrainingScheduleSchema,
})

const archiveScheduleToolSchema = z.object({ scheduleId: z.number().int().positive() })
const classStudentsToolSchema = z.object({ classId: z.number().int().positive() })
const studentProfileToolSchema = z.object({
  studentIdNum: z.string().trim().min(1),
  includeSensitive: z.boolean().optional(),
})
const dailyLogsToolSchema = z.object({
  classId: z.number().int().positive(),
  logDate: dateStringSchema.optional(),
})
const sessionResultsToolSchema = z.object({ sessionId: z.number().int().positive() })
const classReportToolSchema = z.object({
  classId: z.number().int().positive(),
  sessionId: z.number().int().positive().optional(),
})

const reviewSubmissionToolSchema = reviewSubmissionSchema
const submissionIdToolSchema = z.object({ submissionId: z.number().int().positive() })
const updateTemplateToolSchema = z.object({
  templateId: z.number().int().positive(),
  input: createTrainingTemplateSchema,
})
const archiveTemplateToolSchema = z.object({ templateId: z.number().int().positive() })
const createClassToolSchema = z.object({ name: z.string().trim().min(1).max(100) })
const updateClassToolSchema = z.object({ classId: z.number().int().positive(), name: z.string().trim().min(1).max(100) })
const archiveClassToolSchema = z.object({ classId: z.number().int().positive() })
const createStudentToolSchema = z.object({
  classId: z.number().int().positive(),
  studentIdNum: z.string().trim().min(1).max(40),
  fullName: z.string().trim().min(1).max(160),
  gender: z.enum(['L', 'P']),
  dob: dateStringSchema,
  heightCm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
}).strict()
const importStudentsToolSchema = z.object({
  classId: z.number().int().positive(),
  expectedCount: z.number().int().min(1).max(10),
  students: z.array(z.object({ studentIdNum: z.string().trim().min(1).max(40), fullName: z.string().trim().min(1).max(160), gender: z.enum(['L', 'P']), dob: dateStringSchema }).strict()).min(1).max(10),
}).strict().refine((input) => input.expectedCount === input.students.length, 'Bilangan murid tidak sepadan dengan sumber.').refine((input) => new Set(input.students.map((student) => student.studentIdNum)).size === input.students.length, 'ID murid tidak boleh berulang.')
const updateStudentProfileToolSchema = z.object({
  studentIdNum: z.string().trim().min(1).max(40),
  changes: z.object({
    fullName: z.string().trim().min(1).max(160).optional(),
    gender: z.enum(['L', 'P']).optional(),
    dob: dateStringSchema.optional(),
    heightCm: z.number().positive().nullable().optional(),
    weightKg: z.number().positive().nullable().optional(),
  }).strict().refine((changes) => Object.values(changes).some((value) => value !== undefined), 'Masukkan sekurang-kurangnya satu perubahan.'),
})
const dropStudentToolSchema = z.object({
  classId: z.number().int().positive(),
  studentIdNum: z.string().trim().min(1).max(40),
})
const transferStudentToolSchema = z.object({ fromClassId: z.number().int().positive(), toClassId: z.number().int().positive(), studentIdNum: z.string().trim().min(1).max(40) }).refine((input) => input.fromClassId !== input.toClassId, 'Kelas asal dan baharu mesti berbeza.')
const resetStudentPasswordToolSchema = z.object({ studentIdNum: z.string().trim().min(1).max(40) })
const createSegakSessionToolSchema = z.object({
  classId: z.number().int().positive(),
  academicSessionId: z.number().int().positive(),
  title: z.string().trim().min(1).max(160),
  assessmentDate: dateStringSchema,
  phase: z.enum(['PENGGAL_1', 'PENGGAL_2']),
})
const recordSegakResultToolSchema = z.object({
  sessionId: z.number().int().positive(),
  studentIdNum: z.string().trim().min(1).max(40),
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
  measurements: z.array(z.object({ activityCode: z.string().min(1), rawMeasurement: z.number().nonnegative() })).min(1),
  status: z.enum(['draft', 'finalized']).default('draft'),
})
const updateSegakSessionStatusToolSchema = z.object({
  sessionId: z.number().int().positive(),
  status: z.enum(['completed', 'locked']),
})

export type AiActionType =
  | 'create_training_schedule'
  | 'update_training_schedule'
  | 'archive_training_schedule'
  | 'review_training_submission'
  | 'create_training_template'
  | 'update_training_template'
  | 'archive_training_template'
  | 'create_class'
  | 'update_class'
  | 'archive_class'
  | 'create_student'
  | 'import_students'
  | 'update_student_profile'
  | 'drop_student_from_class'
  | 'transfer_student'
  | 'update_teacher_profile'
  | 'reset_student_password'
  | 'create_segak_session'
  | 'record_segak_result'
  | 'update_segak_session_status'

export type AiActionPreview = {
  title: string
  details: Array<{ label: string; value: string }>
}

export type AiSensitiveOutput = {
  label: string
  value: string
  warning: string
}

export type PreparedAiAction = {
  actionType: AiActionType
  payload: unknown
  preview: AiActionPreview
}

export type AiToolResult =
  | { kind: 'read'; content: string }
  | { kind: 'pending'; action: PreparedAiAction }

type JsonSchema = {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
  additionalProperties: false
}

export type DeepSeekFunctionTool = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: JsonSchema
  }
}

const emptyParameters: JsonSchema = { type: 'object', properties: {}, required: [], additionalProperties: false }

const scheduleParameters: JsonSchema = {
  type: 'object',
  properties: {
    classId: { type: 'integer', description: 'ID kelas milik guru.' },
    title: { type: 'string' },
    trainingDate: { type: 'string', description: 'Tarikh ISO YYYY-MM-DD.' },
    instructions: { type: 'string' },
    evidenceRequired: { type: 'boolean' },
    teacherNotes: { type: 'string' },
    activities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          templateId: { type: 'integer' },
          title: { type: 'string' },
          sets: { type: 'integer' },
          reps: { type: ['integer', 'null'] },
          videoUrl: { type: 'string' },
        },
        required: ['title', 'sets', 'videoUrl'],
        additionalProperties: false,
      },
    },
  },
  required: ['classId', 'title', 'trainingDate', 'evidenceRequired', 'activities'],
  additionalProperties: false,
}

const templateParameters: JsonSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    objective: { type: 'string' },
    category: { type: 'string' },
    estimatedDuration: { type: 'number' },
    difficulty: { type: 'string', enum: ['mudah', 'sederhana', 'tinggi'] },
    sets: { type: 'number' },
    reps: { type: 'number' },
    restSeconds: { type: 'number' },
    videoUrl: { type: 'string' },
    safetyNotes: { type: 'string' },
  },
  required: ['title', 'category'],
  additionalProperties: false,
}

export const teacherAiTools: DeepSeekFunctionTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_my_classes',
      description: 'Senaraikan kelas aktif dalam sekolah guru semasa. Gunakan sebelum memilih classId.',
      parameters: emptyParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_class_students',
      description: 'Senaraikan nama dan ID murid dalam kelas aktif sekolah guru semasa. Panggil list_my_classes dahulu untuk mencari ID kelas.',
      parameters: {
        type: 'object',
        properties: { classId: { type: 'integer' } },
        required: ['classId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_my_training_schedules',
      description: 'Senaraikan jadual latihan dalam sekolah guru semasa, termasuk status dan aktiviti ringkas.',
      parameters: emptyParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_my_training_templates',
      description: 'Senaraikan template latihan guru-guru dalam sekolah semasa.',
      parameters: emptyParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_my_submissions',
      description: 'Senaraikan ringkasan penyerahan latihan dalam sekolah semasa. Nota peribadi murid tidak dipulangkan.',
      parameters: emptyParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_training_submission',
      description: 'Dapatkan butiran satu penyerahan latihan dalam sekolah guru semasa, termasuk nota dan ukuran latihan. Panggil hanya apabila guru meminta butiran penyerahan tersebut.',
      parameters: {
        type: 'object',
        properties: { submissionId: { type: 'integer' } },
        required: ['submissionId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_student_profile',
      description: 'Cari profil murid mengikut ID murid dalam sekolah guru semasa. Jangan sertakan butiran sensitif melainkan guru meminta secara jelas.',
      parameters: {
        type: 'object',
        properties: {
          studentIdNum: { type: 'string' },
          includeSensitive: { type: 'boolean', description: 'True hanya jika guru secara khusus meminta tarikh lahir atau ukuran kesihatan.' },
        },
        required: ['studentIdNum'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_class_daily_logs',
      description: 'Baca ringkasan log aktiviti SEGAK bagi kelas dalam sekolah guru semasa. Panggil list_my_classes dahulu.',
      parameters: {
        type: 'object',
        properties: {
          classId: { type: 'integer' },
          logDate: { type: 'string', description: 'Tarikh YYYY-MM-DD; lalai hari ini.' },
        },
        required: ['classId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_segak_activities',
      description: 'Senaraikan aktiviti dan peraturan asas SEGAK yang aktif dalam sistem.',
      parameters: emptyParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_segak_sessions',
      description: 'Senaraikan sesi penilaian SEGAK dalam sekolah guru semasa.',
      parameters: emptyParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_segak_session_results',
      description: 'Dapatkan keputusan SEGAK bagi sesi dalam sekolah guru semasa. Gunakan hanya apabila guru meminta keputusan atau analisis sesi.',
      parameters: {
        type: 'object',
        properties: { sessionId: { type: 'integer' } },
        required: ['sessionId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_class_report',
      description: 'Jana ringkasan laporan SEGAK kelas dalam sekolah guru semasa. sessionId pilihan jika guru mahu laporan sesi tertentu.',
      parameters: {
        type: 'object',
        properties: {
          classId: { type: 'integer' },
          sessionId: { type: 'integer' },
        },
        required: ['classId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_class',
      description: 'Sediakan kelas baharu menggunakan sesi akademik aktif sekolah guru semasa. Tindakan menunggu pengesahan.',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_class',
      description: 'Sediakan kemas kini nama kelas dalam sekolah guru semasa. Tindakan menunggu pengesahan.',
      parameters: {
        type: 'object',
        properties: { classId: { type: 'integer' }, name: { type: 'string' } },
        required: ['classId', 'name'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'archive_class',
      description: 'Sediakan arkib kelas dalam sekolah guru semasa. Murid dan rekod tidak dipadam. Tindakan menunggu pengesahan.',
      parameters: {
        type: 'object',
        properties: { classId: { type: 'integer' } },
        required: ['classId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_student',
      description: 'Sediakan pendaftaran seorang murid dalam kelas sekolah guru semasa. ID murid, nama, jantina dan tarikh lahir diperlukan. Tindakan menunggu pengesahan.',
      parameters: {
        type: 'object',
        properties: {
          classId: { type: 'integer' },
          studentIdNum: { type: 'string' },
          fullName: { type: 'string' },
          gender: { type: 'string', enum: ['L', 'P'] },
          dob: { type: 'string', description: 'Tarikh lahir YYYY-MM-DD.' },
          heightCm: { type: 'number' },
          weightKg: { type: 'number' },
        },
        required: ['classId', 'studentIdNum', 'fullName', 'gender', 'dob'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'import_students',
      description: 'Sediakan import sehingga 10 murid daripada CSV atau senarai untuk satu kelas dalam sekolah semasa. Pastikan semua baris dimasukkan dan guru menyemak pratonton sebelum pengesahan.',
      parameters: {
        type: 'object',
        properties: {
          classId: { type: 'integer' },
          expectedCount: { type: 'integer', description: 'Jumlah baris murid dalam sumber, bukan anggaran.' },
          students: { type: 'array', maxItems: 10, items: { type: 'object', properties: { studentIdNum: { type: 'string' }, fullName: { type: 'string' }, gender: { type: 'string', enum: ['L', 'P'] }, dob: { type: 'string' } }, required: ['studentIdNum', 'fullName', 'gender', 'dob'], additionalProperties: false } },
        },
        required: ['classId', 'expectedCount', 'students'], additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_student_profile',
      description: 'Sediakan kemas kini profil murid dalam sekolah guru semasa. Jangan ubah ID murid. Tindakan menunggu pengesahan.',
      parameters: {
        type: 'object',
        properties: {
          studentIdNum: { type: 'string' },
          changes: {
            type: 'object',
            properties: {
              fullName: { type: 'string' },
              gender: { type: 'string', enum: ['L', 'P'] },
              dob: { type: 'string' },
              heightCm: { type: ['number', 'null'] },
              weightKg: { type: ['number', 'null'] },
            },
            additionalProperties: false,
          },
        },
        required: ['studentIdNum', 'changes'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'drop_student_from_class',
      description: 'Sediakan tindakan keluarkan murid daripada satu kelas di sekolah guru semasa. Rekod murid dan sejarah tidak dipadam. Tindakan menunggu pengesahan.',
      parameters: {
        type: 'object',
        properties: { classId: { type: 'integer' }, studentIdNum: { type: 'string' } },
        required: ['classId', 'studentIdNum'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'transfer_student',
      description: 'Pindahkan murid daripada kelas asal ke kelas baharu dalam sekolah guru semasa. Tindakan menunggu pengesahan.',
      parameters: { type: 'object', properties: { fromClassId: { type: 'integer' }, toClassId: { type: 'integer' }, studentIdNum: { type: 'string' } }, required: ['fromClassId', 'toClassId', 'studentIdNum'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_teacher_profile',
      description: 'Baca nama, email dan nombor telefon profil guru yang sedang log masuk.',
      parameters: emptyParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_my_teacher_profile',
      description: 'Sediakan perubahan profil guru sendiri. Gunakan nilai semasa untuk medan yang tidak diminta diubah dan minta pengesahan.',
      parameters: { type: 'object', properties: { fullName: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' } }, required: ['fullName', 'phone', 'email'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reset_student_password',
      description: 'Sediakan tetapan semula kata laluan murid dalam sekolah guru semasa. Kata laluan sementara hanya dipaparkan sekali selepas pengesahan. Tindakan menunggu pengesahan.',
      parameters: {
        type: 'object',
        properties: { studentIdNum: { type: 'string' } },
        required: ['studentIdNum'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_training_schedule',
      description: 'Sediakan jadual latihan baharu untuk kelas dalam sekolah guru semasa. Jangan cipta jika tarikh, kelas, tajuk, atau aktiviti wajib belum jelas. Tindakan menunggu pengesahan guru.',
      parameters: scheduleParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_training_schedule',
      description: 'Sediakan kemas kini penuh untuk jadual dalam sekolah guru semasa. Tindakan menunggu pengesahan guru.',
      parameters: {
        type: 'object',
        properties: {
          scheduleId: { type: 'integer' },
          input: scheduleParameters,
        },
        required: ['scheduleId', 'input'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'archive_training_schedule',
      description: 'Sediakan tindakan arkib jadual dalam sekolah guru semasa. Tidak memadam data. Tindakan menunggu pengesahan guru.',
      parameters: {
        type: 'object',
        properties: { scheduleId: { type: 'integer' } },
        required: ['scheduleId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'review_training_submission',
      description: 'Sediakan semakan penyerahan latihan dalam sekolah guru semasa. Tindakan menunggu pengesahan guru.',
      parameters: {
        type: 'object',
        properties: {
          submissionId: { type: 'integer' },
          reviewStatus: { type: 'string', enum: ['approved', 'needs_correction', 'rejected'] },
          teacherFeedback: { type: 'string' },
        },
        required: ['submissionId', 'reviewStatus'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_segak_session',
      description: 'Sediakan sesi penilaian SEGAK untuk kelas sekolah guru semasa menggunakan sesi akademik aktif. Tindakan menunggu pengesahan.',
      parameters: {
        type: 'object',
        properties: {
          classId: { type: 'integer' },
          academicSessionId: { type: 'integer' },
          title: { type: 'string' },
          assessmentDate: { type: 'string' },
          phase: { type: 'string', enum: ['PENGGAL_1', 'PENGGAL_2'] },
        },
        required: ['classId', 'academicSessionId', 'title', 'assessmentDate', 'phase'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_segak_result',
      description: 'Sediakan keputusan SEGAK untuk murid dalam sesi sekolah semasa. Dapatkan semua ukuran aktiviti yang berkenaan; BMI dikira daripada tinggi dan berat, jangan masukkan BMI sebagai aktiviti. Tindakan menunggu pengesahan.',
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'integer' },
          studentIdNum: { type: 'string' },
          heightCm: { type: 'number' },
          weightKg: { type: 'number' },
          measurements: {
            type: 'array',
            items: {
              type: 'object',
              properties: { activityCode: { type: 'string' }, rawMeasurement: { type: 'number' } },
              required: ['activityCode', 'rawMeasurement'],
              additionalProperties: false,
            },
          },
          status: { type: 'string', enum: ['draft', 'finalized'] },
        },
        required: ['sessionId', 'studentIdNum', 'heightCm', 'weightKg', 'measurements'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_segak_session_status',
      description: 'Sediakan penyelesaian atau kunci sesi SEGAK sekolah semasa. Sesi yang dikunci tidak menerima perubahan. Tindakan menunggu pengesahan.',
      parameters: {
        type: 'object',
        properties: { sessionId: { type: 'integer' }, status: { type: 'string', enum: ['completed', 'locked'] } },
        required: ['sessionId', 'status'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_training_template',
      description: 'Sediakan template latihan baharu untuk sekolah guru semasa. Tindakan menunggu pengesahan guru.',
      parameters: templateParameters,
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_training_template',
      description: 'Sediakan kemas kini penuh untuk template latihan dalam sekolah guru semasa. Tindakan menunggu pengesahan guru.',
      parameters: {
        type: 'object',
        properties: { templateId: { type: 'integer' }, input: templateParameters },
        required: ['templateId', 'input'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'archive_training_template',
      description: 'Sediakan tindakan arkib template latihan dalam sekolah guru semasa. Data tidak dipadam. Tindakan menunggu pengesahan guru.',
      parameters: {
        type: 'object',
        properties: { templateId: { type: 'integer' } },
        required: ['templateId'],
        additionalProperties: false,
      },
    },
  },
]

export class AiToolService {
  constructor(
    private readonly classRepo: ClassRepository,
    private readonly trainingService: TrainingService,
    private readonly userRepo: UserRepository,
    private readonly segakRepo: SegakRepository,
    private readonly teacherSchoolService: TeacherSchoolService,
    private readonly segakService: SegakService,
  ) {}

  public async run(user: AuthUser, name: string, rawArguments: string): Promise<AiToolResult> {
    if (user.role !== 'teacher') return this.readError('Chatbot ini hanya tersedia untuk guru.')
    const schoolId = await this.teacherSchoolId(user)
    if (!schoolId) return this.readError('Akaun guru belum dipautkan kepada sekolah.')

    let argumentsValue: unknown
    try {
      argumentsValue = JSON.parse(rawArguments)
    } catch {
      return this.readError('Argumen tool tidak dapat dibaca. Minta maklumat semula daripada guru.')
    }

    if (name === 'list_my_classes') {
      const classes = await this.classRepo.findBySchool(schoolId)
      return { kind: 'read', content: JSON.stringify(classes.map(({ id, name, status, academicSessionId }) => ({ id, name, status, academicSessionId }))) }
    }

    if (name === 'list_class_students') {
      const parsed = classStudentsToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const targetClass = await this.classRepo.findByIdForSchool(parsed.data.classId, schoolId)
      if (!targetClass || targetClass.status !== 'active') {
        return this.readError('Kelas tidak ditemui atau bukan kelas aktif di sekolah ini.')
      }
      const students = await this.classRepo.getClassStudentNamesForSchool(parsed.data.classId, schoolId, 101)
      const isTruncated = students.length > 100
      const names = students.slice(0, 100).map((student) => ({ name: student.fullName, studentIdNum: student.studentIdNum }))
      return {
        kind: 'read',
        content: JSON.stringify({ className: targetClass.name, students: names, truncated: isTruncated }),
      }
    }

    if (name === 'get_student_profile') {
      const parsed = studentProfileToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const profile = await this.userRepo.getStudentProfileByStudentIdNum(schoolId, parsed.data.studentIdNum)
      if (!profile) return this.readError('Murid tidak ditemui dalam sekolah ini.')
      const student = {
        studentIdNum: profile.studentIdNum,
        fullName: profile.fullName,
        gender: profile.gender,
        status: profile.status,
        ...(parsed.data.includeSensitive
          ? {
              dateOfBirth: profile.dob,
              heightCm: profile.heightCm,
              weightKg: profile.weightKg,
            }
          : {}),
      }
      return { kind: 'read', content: JSON.stringify(student) }
    }

    if (name === 'get_class_daily_logs') {
      const parsed = dailyLogsToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const targetClass = await this.classRepo.findByIdForSchool(parsed.data.classId, schoolId)
      if (!targetClass || targetClass.status !== 'active') {
        return this.readError('Kelas tidak ditemui atau bukan kelas aktif di sekolah ini.')
      }
      const logDate = parsed.data.logDate ?? new Date().toISOString().slice(0, 10)
      const rows = await this.trainingService.getClassDailyLogsForSchool(parsed.data.classId, schoolId, logDate)
      const latestByStudent = new Map<number, (typeof rows)[number]>()
      for (const row of rows) {
        if (!latestByStudent.has(row.studentUserId)) latestByStudent.set(row.studentUserId, row)
      }
      const students = Array.from(latestByStudent.values()).map((row) => ({
        name: row.fullName,
        studentIdNum: row.studentIdNum,
        status: row.logId ? 'completed' : 'not_completed',
        log: row.logId
          ? {
              warmupCompleted: row.warmupCompleted,
              curlUpReps: row.curlUpReps,
              cardioDurationMinutes: row.cardioDurationMinutes,
              cardioPulseOrReps: row.cardioPulseOrReps,
              pushUpReps: row.pushUpReps,
              sitReachCm: row.sitReachCm,
            }
          : null,
      }))
      return {
        kind: 'read',
        content: JSON.stringify({
          className: targetClass.name,
          logDate,
          total: students.length,
          completed: students.filter((student) => student.status === 'completed').length,
          students,
        }),
      }
    }

    if (name === 'list_segak_activities') {
      const activities = await this.segakRepo.getAllActivities()
      return {
        kind: 'read',
        content: JSON.stringify(
          activities.map(({ code, name: activityName, description, measurementType, unit, minAge, maxAge }) => ({
            code,
            name: activityName,
            description,
            measurementType,
            unit,
            minAge,
            maxAge,
          })),
        ),
      }
    }

    if (name === 'list_segak_sessions') {
      const sessions = await this.segakRepo.getSessionsBySchool(schoolId)
      return {
        kind: 'read',
        content: JSON.stringify(
          sessions.map(({ id, classId, title, assessmentDate, phase, status }) => ({
            id,
            classId,
            title,
            assessmentDate,
            phase,
            status,
          })),
        ),
      }
    }

    if (name === 'get_segak_session_results') {
      const parsed = sessionResultsToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const session = await this.segakRepo.getSessionByIdForSchool(parsed.data.sessionId, schoolId)
      if (!session) return this.readError('Sesi SEGAK tidak ditemui dalam sekolah ini.')
      const results = await this.segakRepo.getResultsBySessionForSchool(session.id, schoolId)
      return {
        kind: 'read',
        content: JSON.stringify({ sessionTitle: session.title, assessmentDate: session.assessmentDate, results }),
      }
    }

    if (name === 'get_class_report') {
      const parsed = classReportToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const targetClass = await this.classRepo.findByIdForSchool(parsed.data.classId, schoolId)
      if (!targetClass) return this.readError('Kelas tidak ditemui dalam sekolah ini.')
      const totalStudents = await this.classRepo.countClassStudentsForSchool(targetClass.id, schoolId)
      const reportSession = parsed.data.sessionId
        ? await this.segakRepo.getSessionByIdForSchool(parsed.data.sessionId, schoolId)
        : null
      if (parsed.data.sessionId && (!reportSession || reportSession.classId !== targetClass.id)) {
        return this.readError('Sesi SEGAK tidak sepadan dengan kelas ini.')
      }
      const results = reportSession
        ? await this.segakRepo.getResultsBySessionForSchool(reportSession.id, schoolId)
        : []
      const completedCount = reportSession ? await this.segakRepo.countResultsBySessionForSchool(reportSession.id, schoolId) : 0
      const completionRate = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0
      return {
        kind: 'read',
        content: JSON.stringify({
          className: targetClass.name,
          totalStudents,
          completedCount,
          completionRate,
          ...(reportSession ? { sessionTitle: reportSession.title, results } : {}),
          resultsTruncated: results.length >= 100,
        }),
      }
    }

    if (name === 'create_class') {
      const parsed = createClassToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const currentSession = await this.teacherSchoolService.getCurrentAcademicSessionForSchool(schoolId)
      if (!currentSession) return this.readError('Sekolah belum mempunyai sesi akademik aktif.')
      return {
        kind: 'pending',
        action: {
          actionType: 'create_class',
          payload: parsed.data,
          preview: {
            title: 'Cipta kelas baharu',
            details: [
              { label: 'Sesi akademik', value: currentSession.name },
              { label: 'Nama kelas', value: parsed.data.name },
            ],
          },
        },
      }
    }

    if (name === 'update_class') {
      const parsed = updateClassToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const classRow = await this.classRepo.findByIdForSchool(parsed.data.classId, schoolId)
      if (!classRow || classRow.status !== 'active') return this.readError('Kelas tidak ditemui dalam sekolah ini.')
      return {
        kind: 'pending',
        action: {
          actionType: 'update_class',
          payload: parsed.data,
          preview: {
            title: 'Kemas kini kelas',
            details: [
              { label: 'Nama asal', value: classRow.name },
              { label: 'Nama baharu', value: parsed.data.name },
            ],
          },
        },
      }
    }

    if (name === 'archive_class') {
      const parsed = archiveClassToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const classRow = await this.classRepo.findByIdForSchool(parsed.data.classId, schoolId)
      if (!classRow || classRow.status !== 'active') return this.readError('Kelas tidak ditemui dalam sekolah ini.')
      return {
        kind: 'pending',
        action: {
          actionType: 'archive_class',
          payload: parsed.data,
          preview: {
            title: 'Arkibkan kelas',
            details: [
              { label: 'Kelas', value: classRow.name },
              { label: 'Tindakan', value: 'Kelas dinyahaktifkan; data murid dan rekod lama dikekalkan.' },
            ],
          },
        },
      }
    }

    if (name === 'create_student') {
      const parsed = createStudentToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const targetClass = await this.classRepo.findByIdForSchool(parsed.data.classId, schoolId)
      if (!targetClass || targetClass.status !== 'active') return this.readError('Kelas tidak ditemui atau bukan kelas aktif di sekolah ini.')
      if (await this.userRepo.findByLoginIdentifier(parsed.data.studentIdNum)) {
        return this.readError('ID murid itu sudah digunakan. Minta guru semak ID yang betul.')
      }
      return {
        kind: 'pending',
        action: {
          actionType: 'create_student',
          payload: parsed.data,
          preview: {
            title: 'Daftar murid baharu',
            details: [
              { label: 'Kelas', value: targetClass.name },
              { label: 'ID murid', value: parsed.data.studentIdNum },
              { label: 'Nama', value: parsed.data.fullName },
              { label: 'Jantina', value: parsed.data.gender },
              { label: 'Tarikh lahir', value: parsed.data.dob },
              ...(parsed.data.heightCm === undefined ? [] : [{ label: 'Tinggi (cm)', value: String(parsed.data.heightCm) }]),
              ...(parsed.data.weightKg === undefined ? [] : [{ label: 'Berat (kg)', value: String(parsed.data.weightKg) }]),
            ],
          },
        },
      }
    }

    if (name === 'import_students') {
      const parsed = importStudentsToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const targetClass = await this.classRepo.findByIdForSchool(parsed.data.classId, schoolId)
      if (!targetClass || targetClass.status !== 'active') return this.readError('Kelas tidak ditemui dalam sekolah ini.')
      const existing = await this.userRepo.findExistingLoginIdentifiers(parsed.data.students.map((student) => student.studentIdNum))
      if (existing.length) return this.readError('Ada ID murid yang sudah digunakan. Semak fail sebelum import.')
      return { kind: 'pending', action: { actionType: 'import_students', payload: parsed.data, preview: { title: 'Import murid pukal', details: [{ label: 'Kelas', value: targetClass.name }, { label: 'Bilangan', value: String(parsed.data.students.length) }, ...parsed.data.students.map((student, index) => ({ label: `Murid ${index + 1}`, value: `${student.studentIdNum} — ${student.fullName}; ${student.gender}; ${student.dob}` }))] } } }
    }

    if (name === 'update_student_profile') {
      const parsed = updateStudentProfileToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const student = await this.userRepo.getStudentProfileByStudentIdNum(schoolId, parsed.data.studentIdNum)
      if (!student) return this.readError('Murid tidak ditemui dalam sekolah ini.')
      return {
        kind: 'pending',
        action: {
          actionType: 'update_student_profile',
          payload: parsed.data,
          preview: {
            title: 'Kemas kini profil murid',
            details: [
              { label: 'ID murid', value: student.studentIdNum },
              { label: 'Nama semasa', value: student.fullName },
              ...Object.entries(parsed.data.changes).map(([field, value]) => ({
                label: field,
                value: value === null ? 'Kosongkan' : String(value),
              })),
            ],
          },
        },
      }
    }

    if (name === 'drop_student_from_class') {
      const parsed = dropStudentToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const targetClass = await this.classRepo.findByIdForSchool(parsed.data.classId, schoolId)
      const student = await this.userRepo.getStudentProfileByStudentIdNum(schoolId, parsed.data.studentIdNum)
      if (!targetClass || !student) return this.readError('Murid atau kelas tidak ditemui dalam sekolah ini.')
      return {
        kind: 'pending',
        action: {
          actionType: 'drop_student_from_class',
          payload: parsed.data,
          preview: {
            title: 'Keluarkan murid daripada kelas',
            details: [
              { label: 'Murid', value: student.fullName },
              { label: 'ID murid', value: student.studentIdNum },
              { label: 'Kelas', value: targetClass.name },
              { label: 'Tindakan', value: 'Keahlian kelas digugurkan; akaun dan sejarah murid kekal.' },
            ],
          },
        },
      }
    }

    if (name === 'transfer_student') {
      const parsed = transferStudentToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const [source, target, student] = await Promise.all([
        this.classRepo.findByIdForSchool(parsed.data.fromClassId, schoolId),
        this.classRepo.findByIdForSchool(parsed.data.toClassId, schoolId),
        this.userRepo.getStudentProfileByStudentIdNum(schoolId, parsed.data.studentIdNum),
      ])
      if (!source || !target || source.status !== 'active' || target.status !== 'active' || !student) return this.readError('Murid atau kelas tidak ditemui dalam sekolah ini.')
      if (!(await this.classRepo.hasActiveStudentInClassForSchool(source.id, schoolId, student.userId))) return this.readError('Murid tiada dalam kelas asal.')
      if (await this.classRepo.hasActiveStudentInClassForSchool(target.id, schoolId, student.userId)) return this.readError('Murid sudah berada dalam kelas baharu.')
      return { kind: 'pending', action: { actionType: 'transfer_student', payload: parsed.data, preview: { title: 'Pindahkan murid', details: [{ label: 'Murid', value: `${student.fullName} (${student.studentIdNum})` }, { label: 'Kelas asal', value: source.name }, { label: 'Kelas baharu', value: target.name }] } } }
    }

    if (name === 'get_my_teacher_profile') {
      return { kind: 'read', content: JSON.stringify(await this.teacherSchoolService.getOwnProfile(user)) }
    }

    if (name === 'update_my_teacher_profile') {
      const parsed = updateProfileSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      return { kind: 'pending', action: { actionType: 'update_teacher_profile', payload: parsed.data, preview: { title: 'Kemas kini profil guru', details: [{ label: 'Nama', value: parsed.data.fullName }, { label: 'Telefon', value: parsed.data.phone || 'Tiada' }, { label: 'Email', value: parsed.data.email }] } } }
    }

    if (name === 'reset_student_password') {
      const parsed = resetStudentPasswordToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const student = await this.userRepo.getStudentProfileByStudentIdNum(schoolId, parsed.data.studentIdNum)
      if (!student) return this.readError('Murid tidak ditemui dalam sekolah ini.')
      return {
        kind: 'pending',
        action: {
          actionType: 'reset_student_password',
          payload: parsed.data,
          preview: {
            title: 'Tetapkan semula kata laluan murid',
            details: [
              { label: 'Murid', value: student.fullName },
              { label: 'ID murid', value: student.studentIdNum },
              { label: 'Tindakan', value: 'Kata laluan sementara dijana dan dipaparkan sekali selepas pengesahan.' },
            ],
          },
        },
      }
    }

    if (name === 'create_segak_session') {
      const parsed = createSegakSessionToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const targetClass = await this.classRepo.findByIdForSchool(parsed.data.classId, schoolId)
      const academicSession = await this.teacherSchoolService.findAcademicSessionForSchool(schoolId, parsed.data.academicSessionId)
      if (!targetClass || targetClass.status !== 'active' || !academicSession || targetClass.academicSessionId !== academicSession.id) {
        return this.readError('Kelas atau sesi akademik tidak sepadan dalam sekolah ini.')
      }
      return {
        kind: 'pending',
        action: {
          actionType: 'create_segak_session',
          payload: parsed.data,
          preview: {
            title: 'Cipta sesi penilaian SEGAK',
            details: [
              { label: 'Kelas', value: targetClass.name },
              { label: 'Sesi akademik', value: academicSession.name },
              { label: 'Tajuk', value: parsed.data.title },
              { label: 'Tarikh', value: parsed.data.assessmentDate },
              { label: 'Penggal', value: parsed.data.phase },
            ],
          },
        },
      }
    }

    if (name === 'record_segak_result') {
      const parsed = recordSegakResultToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const session = await this.segakRepo.getSessionByIdForSchool(parsed.data.sessionId, schoolId)
      const student = await this.userRepo.getStudentProfileByStudentIdNum(schoolId, parsed.data.studentIdNum)
      if (!session || !student || !(await this.segakRepo.studentBelongsToSessionClass(session.id, student.userId, schoolId))) {
        return this.readError('Sesi atau murid tidak ditemui dalam kelas sekolah ini.')
      }
      if (session.status === 'locked' || session.status === 'completed') return this.readError('Sesi SEGAK telah ditutup.')
      return {
        kind: 'pending',
        action: {
          actionType: 'record_segak_result',
          payload: parsed.data,
          preview: {
            title: 'Rekod keputusan SEGAK',
            details: [
              { label: 'Sesi', value: session.title },
              { label: 'Murid', value: student.fullName },
              { label: 'ID murid', value: student.studentIdNum },
              { label: 'Tinggi (cm)', value: String(parsed.data.heightCm) },
              { label: 'Berat (kg)', value: String(parsed.data.weightKg) },
              { label: 'Ukuran aktiviti', value: parsed.data.measurements.map((item) => `${item.activityCode}: ${item.rawMeasurement}`).join(', ') },
              { label: 'Status', value: parsed.data.status },
            ],
          },
        },
      }
    }

    if (name === 'update_segak_session_status') {
      const parsed = updateSegakSessionStatusToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const session = await this.segakRepo.getSessionByIdForSchool(parsed.data.sessionId, schoolId)
      if (!session) return this.readError('Sesi SEGAK tidak ditemui dalam sekolah ini.')
      if (session.status === 'locked' || session.status === 'completed') return this.readError('Sesi SEGAK telah ditutup.')
      return {
        kind: 'pending',
        action: {
          actionType: 'update_segak_session_status',
          payload: parsed.data,
          preview: {
            title: 'Tutup sesi SEGAK',
            details: [
              { label: 'Sesi', value: session.title },
              { label: 'Status asal', value: session.status },
              { label: 'Status baharu', value: parsed.data.status },
            ],
          },
        },
      }
    }

    if (name === 'list_my_training_schedules') {
      const schedules = await this.trainingService.getSchedulesForSchool(schoolId)
      return {
        kind: 'read',
        content: JSON.stringify(
          schedules.map((schedule) => ({
            id: schedule.id,
            classId: schedule.classId,
            title: schedule.title,
            trainingDate: schedule.trainingDate,
            dueDate: schedule.dueDate,
            status: schedule.status,
            activities: schedule.activities.map((activity) => ({ title: activity.title, sets: activity.sets, reps: activity.reps })),
          })),
        ),
      }
    }

    if (name === 'list_my_training_templates') {
      const templates = await this.trainingService.getTemplatesForSchool(schoolId)
      return {
        kind: 'read',
        content: JSON.stringify(
          templates.map(({ id, title, description, objective, category, estimatedDuration, difficulty, sets, reps, restSeconds, videoUrl, status }) => ({
            id,
            title,
            description,
            objective,
            category,
            estimatedDuration,
            difficulty,
            sets,
            reps,
            restSeconds,
            videoUrl,
            status,
          })),
        ),
      }
    }

    if (name === 'list_my_submissions') {
      const submissions = await this.trainingService.getSubmissionsForSchool(schoolId)
      return {
        kind: 'read',
        content: JSON.stringify(
          submissions.map(({ submissionId, submissionDate, reviewStatus, durationMinutes, setsCompleted, repsCompleted, scheduleTitle, className, studentName, studentIdNum }) => ({
            submissionId,
            className,
            studentName,
            studentIdNum,
            submissionDate,
            reviewStatus,
            durationMinutes,
            setsCompleted,
            repsCompleted,
            scheduleTitle,
          })),
        ),
      }
    }

    if (name === 'get_training_submission') {
      const parsed = submissionIdToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const submission = await this.trainingService.getSubmissionForSchool(parsed.data.submissionId, schoolId)
      if (!submission) return this.readError('Penyerahan tidak ditemui dalam sekolah ini.')
      return { kind: 'read', content: JSON.stringify(submission) }
    }

    if (name === 'create_training_schedule') {
      const parsed = createTrainingScheduleSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const targetClass = await this.classRepo.findByIdForSchool(parsed.data.classId, schoolId)
      if (!targetClass || targetClass.status !== 'active') return this.readError('Kelas tidak ditemui atau bukan kelas aktif guru ini.')
      return {
        kind: 'pending',
        action: {
          actionType: 'create_training_schedule',
          payload: parsed.data,
          preview: this.schedulePreview('Cipta jadual latihan', targetClass.name, parsed.data),
        },
      }
    }

    if (name === 'update_training_schedule') {
      const parsed = updateScheduleToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const current = await this.trainingService.getScheduleForSchool(parsed.data.scheduleId, schoolId)
      const targetClass = await this.classRepo.findByIdForSchool(parsed.data.input.classId, schoolId)
      if (!current || !targetClass || targetClass.status !== 'active') {
        return this.readError('Jadual atau kelas tidak ditemui dalam skop sekolah ini.')
      }
      if (current.status === 'archived') return this.readError('Jadual yang telah diarkibkan tidak boleh diubah.')
      return {
        kind: 'pending',
        action: {
          actionType: 'update_training_schedule',
          payload: parsed.data,
          preview: this.schedulePreview('Kemas kini jadual latihan', targetClass.name, parsed.data.input, current.title),
        },
      }
    }

    if (name === 'archive_training_schedule') {
      const parsed = archiveScheduleToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const schedule = await this.trainingService.getScheduleForSchool(parsed.data.scheduleId, schoolId)
      if (!schedule) return this.readError('Jadual tidak ditemui dalam skop sekolah ini.')
      return {
        kind: 'pending',
        action: {
          actionType: 'archive_training_schedule',
          payload: parsed.data,
          preview: {
            title: 'Arkibkan jadual latihan',
            details: [
              { label: 'Jadual', value: schedule.title },
              { label: 'Tarikh latihan', value: schedule.trainingDate },
              { label: 'Tindakan', value: 'Jadual disimpan sebagai arkib tanpa memadam rekod berkaitan.' },
            ],
          },
        },
      }
    }

    if (name === 'review_training_submission') {
      const parsed = reviewSubmissionToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const submission = await this.trainingService.getSubmissionForSchool(parsed.data.submissionId, schoolId)
      if (!submission) return this.readError('Penyerahan tidak ditemui dalam skop sekolah ini.')
      return {
        kind: 'pending',
        action: {
          actionType: 'review_training_submission',
          payload: parsed.data,
          preview: {
            title: 'Semak penyerahan latihan',
            details: [
              { label: 'ID penyerahan', value: String(submission.submissionId) },
              { label: 'Latihan', value: submission.scheduleTitle },
              { label: 'Status baharu', value: parsed.data.reviewStatus },
              { label: 'Maklum balas', value: parsed.data.teacherFeedback || 'Tiada maklum balas' },
            ],
          },
        },
      }
    }

    if (name === 'create_training_template') {
      const parsed = createTrainingTemplateSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      return {
        kind: 'pending',
        action: {
          actionType: 'create_training_template',
          payload: parsed.data,
          preview: this.templatePreview('Cipta template latihan', parsed.data),
        },
      }
    }

    if (name === 'update_training_template') {
      const parsed = updateTemplateToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const template = await this.trainingService.getTemplateForSchool(parsed.data.templateId, schoolId)
      if (!template) return this.readError('Template tidak ditemui dalam skop sekolah ini.')
      if (template.status === 'archived') return this.readError('Template yang telah diarkibkan tidak boleh diubah.')
      return {
        kind: 'pending',
        action: {
          actionType: 'update_training_template',
          payload: parsed.data,
          preview: this.templatePreview('Kemas kini template latihan', parsed.data.input, template.title),
        },
      }
    }

    if (name === 'archive_training_template') {
      const parsed = archiveTemplateToolSchema.safeParse(argumentsValue)
      if (!parsed.success) return this.validationError(parsed.error.flatten().fieldErrors)
      const template = await this.trainingService.getTemplateForSchool(parsed.data.templateId, schoolId)
      if (!template) return this.readError('Template tidak ditemui dalam skop sekolah ini.')
      return {
        kind: 'pending',
        action: {
          actionType: 'archive_training_template',
          payload: parsed.data,
          preview: {
            title: 'Arkibkan template latihan',
            details: [
              { label: 'Template', value: template.title },
              { label: 'Kategori', value: template.category },
              { label: 'Tindakan', value: 'Template disimpan sebagai arkib.' },
            ],
          },
        },
      }
    }

    return this.readError('Tool tersebut tidak dibenarkan.')
  }

  public async confirm(user: AuthUser, actionType: AiActionType, payloadJson: string, actionId: string, expectedSchoolId: number) {
    const schoolId = await this.teacherSchoolId(user)
    if (!schoolId || schoolId !== expectedSchoolId) throw new ApiException(403, 'Skop sekolah telah berubah. Sediakan tindakan baharu.')
    const payloadValue: unknown = JSON.parse(payloadJson)

    if (actionType === 'create_class') {
      const parsed = createClassToolSchema.parse(payloadValue)
      const created = await this.teacherSchoolService.createClass(user, parsed.name)
      return { message: `Kelas "${created.name}" berjaya dicipta.`, result: created }
    }

    if (actionType === 'update_class') {
      const parsed = updateClassToolSchema.parse(payloadValue)
      const updated = await this.teacherSchoolService.updateClass(user, parsed.classId, parsed.name)
      return { message: `Kelas berjaya dinamakan "${updated.name}".`, result: updated }
    }

    if (actionType === 'archive_class') {
      const parsed = archiveClassToolSchema.parse(payloadValue)
      const archived = await this.teacherSchoolService.archiveClass(user, parsed.classId)
      return { message: `Kelas "${archived.name}" berjaya diarkibkan.`, result: archived }
    }

    if (actionType === 'create_student') {
      const parsed = createStudentToolSchema.parse(payloadValue)
      const { classId, ...profile } = parsed
      const created = await this.teacherSchoolService.createStudent(user, classId, profile)
      return {
        message: `Murid ${created.fullName} (${created.studentIdNum}) berjaya didaftarkan. Kata laluan sementara dipaparkan sekali di ruang selamat.`,
        result: { studentIdNum: created.studentIdNum, fullName: created.fullName },
        sensitiveOutput: {
          label: 'Kata laluan sementara',
          value: created.temporaryPassword,
          warning: 'Salin sekarang. Kata laluan ini tidak disimpan dalam sejarah chat.',
        } satisfies AiSensitiveOutput,
      }
    }

    if (actionType === 'import_students') {
      const parsed = importStudentsToolSchema.parse(payloadValue)
      const created = await this.teacherSchoolService.importStudents(user, parsed.classId, parsed.students, schoolId)
      return { message: `${created.length} murid berjaya diimport. Kata laluan sementara dipaparkan sekali di ruang selamat.`, result: { count: created.length }, sensitiveOutput: { label: 'Kata laluan sementara murid', value: created.map((student) => `${student.studentIdNum}: ${student.password}`).join('\n'), warning: 'Salin semua kata laluan sekarang. Maklumat ini tidak disimpan dalam sejarah chat.' } satisfies AiSensitiveOutput }
    }

    if (actionType === 'update_student_profile') {
      const parsed = updateStudentProfileToolSchema.parse(payloadValue)
      const updated = await this.teacherSchoolService.updateStudentProfile(user, parsed.studentIdNum, parsed.changes)
      return {
        message: `Profil murid ${updated.fullName} (${updated.studentIdNum}) berjaya dikemas kini.`,
        result: { studentIdNum: updated.studentIdNum, fullName: updated.fullName },
      }
    }

    if (actionType === 'drop_student_from_class') {
      const parsed = dropStudentToolSchema.parse(payloadValue)
      const dropped = await this.teacherSchoolService.dropStudentFromClass(user, parsed.classId, parsed.studentIdNum)
      return { message: `Murid ${dropped.studentIdNum} dikeluarkan daripada kelas ${dropped.className}.`, result: dropped }
    }

    if (actionType === 'transfer_student') {
      const parsed = transferStudentToolSchema.parse(payloadValue)
      const result = await this.teacherSchoolService.transferStudent(user, parsed.fromClassId, parsed.toClassId, parsed.studentIdNum, schoolId)
      return { message: `${result.fullName} berjaya dipindahkan daripada ${result.fromClass} ke ${result.toClass}.`, result }
    }

    if (actionType === 'update_teacher_profile') {
      const parsed = updateProfileSchema.parse(payloadValue)
      const result = await this.teacherSchoolService.updateOwnProfile(user, parsed, schoolId)
      return { message: 'Profil guru berjaya dikemas kini.', result }
    }

    if (actionType === 'reset_student_password') {
      const parsed = resetStudentPasswordToolSchema.parse(payloadValue)
      const reset = await this.teacherSchoolService.resetStudentPassword(user, parsed.studentIdNum)
      return {
        message: `Kata laluan murid ${reset.fullName} (${reset.studentIdNum}) ditetapkan semula. Kata laluan sementara dipaparkan sekali di ruang selamat.`,
        result: { studentIdNum: reset.studentIdNum },
        sensitiveOutput: {
          label: 'Kata laluan sementara',
          value: reset.temporaryPassword,
          warning: 'Salin sekarang. Kata laluan ini tidak disimpan dalam sejarah chat.',
        } satisfies AiSensitiveOutput,
      }
    }

    if (actionType === 'create_segak_session') {
      const parsed = createSegakSessionToolSchema.parse(payloadValue)
      const session = await this.segakService.createSessionForSchool(user, schoolId, parsed)
      return { message: `Sesi SEGAK "${session.title}" berjaya dicipta.`, result: { sessionId: session.id } }
    }

    if (actionType === 'record_segak_result') {
      const parsed = recordSegakResultToolSchema.parse(payloadValue)
      const result = await this.segakService.recordResultForSchool(user, schoolId, parsed, actionId)
      return {
        message: `Keputusan SEGAK untuk ${result.fullName} berjaya direkodkan. Skor keseluruhan ${result.totalScore}; gred ${result.overallGrade}.`,
        result: { resultId: result.resultId, status: result.status, totalScore: result.totalScore, overallGrade: result.overallGrade },
      }
    }

    if (actionType === 'update_segak_session_status') {
      const parsed = updateSegakSessionStatusToolSchema.parse(payloadValue)
      const session = await this.segakService.updateSessionStatusForSchool(user, schoolId, parsed.sessionId, parsed.status)
      return { message: `Sesi SEGAK "${session.title}" kini berstatus ${session.status}.`, result: { sessionId: session.id, status: session.status } }
    }

    if (actionType === 'create_training_schedule') {
      const parsed = createTrainingScheduleSchema.parse(payloadValue)
      const schedule = await this.trainingService.createScheduleForSchool(user, schoolId, parsed, actionId)
      return { message: `Jadual "${schedule.title}" berjaya dicipta.`, result: { scheduleId: schedule.id } }
    }

    if (actionType === 'update_training_schedule') {
      const parsed = updateScheduleToolSchema.parse(payloadValue)
      const schedule = await this.trainingService.updateScheduleForSchool(user, schoolId, parsed.scheduleId, parsed.input)
      return { message: `Jadual "${schedule.title}" berjaya dikemas kini.`, result: { scheduleId: schedule.id } }
    }

    if (actionType === 'archive_training_schedule') {
      const parsed = archiveScheduleToolSchema.parse(payloadValue)
      const schedule = await this.trainingService.archiveScheduleForSchool(user, schoolId, parsed.scheduleId)
      return { message: `Jadual "${schedule.title}" berjaya diarkibkan.`, result: { scheduleId: schedule.id } }
    }

    if (actionType === 'create_training_template') {
      const parsed = createTrainingTemplateSchema.parse(payloadValue)
      const template = await this.trainingService.createTemplateForSchool(user, schoolId, parsed, actionId)
      return { message: `Template "${template.title}" berjaya dicipta.`, result: { templateId: template.id } }
    }

    if (actionType === 'update_training_template') {
      const parsed = updateTemplateToolSchema.parse(payloadValue)
      const template = await this.trainingService.updateTemplateForSchool(user, schoolId, parsed.templateId, parsed.input)
      return { message: `Template "${template.title}" berjaya dikemas kini.`, result: { templateId: template.id } }
    }

    if (actionType === 'archive_training_template') {
      const parsed = archiveTemplateToolSchema.parse(payloadValue)
      const template = await this.trainingService.archiveTemplateForSchool(user, schoolId, parsed.templateId)
      return { message: `Template "${template.title}" berjaya diarkibkan.`, result: { templateId: template.id } }
    }

    const parsed = reviewSubmissionToolSchema.parse(payloadValue)
    const submission = await this.trainingService.reviewSubmissionForSchool(user, schoolId, parsed)
    return {
      message: `Penyerahan ${submission?.submissionId ?? parsed.submissionId} berjaya disemak dengan status ${parsed.reviewStatus}.`,
      result: { submissionId: parsed.submissionId, reviewStatus: parsed.reviewStatus },
    }
  }

  private schedulePreview(title: string, className: string, input: TrainingScheduleInput, previousTitle?: string): AiActionPreview {
    return {
      title,
      details: [
        { label: 'Kelas', value: className },
        { label: 'Tajuk', value: input.title },
        ...(previousTitle ? [{ label: 'Tajuk asal', value: previousTitle }] : []),
        { label: 'Tarikh latihan', value: input.trainingDate },
        { label: 'Arahan', value: input.instructions || 'Tiada arahan' },
        { label: 'Bukti diperlukan', value: input.evidenceRequired ? 'Ya' : 'Tidak' },
        { label: 'Nota guru', value: input.teacherNotes || 'Tiada nota' },
        ...input.activities.map((activity) => ({ label: 'Aktiviti', value: `${activity.title}; set ${activity.sets}; ulangan ${activity.reps ?? '-'}; video ${activity.videoUrl}; template ${activity.templateId ?? '-'}` })),
      ],
    }
  }

  private templatePreview(title: string, input: TrainingTemplateInput, previousTitle?: string): AiActionPreview {
    return {
      title,
      details: [
        { label: 'Tajuk', value: input.title },
        ...(previousTitle ? [{ label: 'Tajuk asal', value: previousTitle }] : []),
        { label: 'Kategori', value: input.category },
        { label: 'Penerangan', value: input.description || 'Tiada penerangan' },
        { label: 'Objektif', value: input.objective || 'Tiada objektif' },
        { label: 'Tempoh (minit)', value: input.estimatedDuration === undefined ? '-' : String(input.estimatedDuration) },
        { label: 'Kesukaran', value: input.difficulty },
        { label: 'Set / ulangan', value: `${input.sets} / ${input.reps}` },
        { label: 'Rehat (saat)', value: String(input.restSeconds) },
        { label: 'Video', value: input.videoUrl || 'Tiada video' },
        { label: 'Nota keselamatan', value: input.safetyNotes || 'Tiada nota keselamatan' },
      ],
    }
  }

  private validationError(errors: Record<string, string[] | undefined>): AiToolResult {
    return { kind: 'read', content: JSON.stringify({ error: 'Argumen tidak sah.', errors }) }
  }

  private readError(message: string): AiToolResult {
    return { kind: 'read', content: JSON.stringify({ error: message }) }
  }

  private async teacherSchoolId(user: AuthUser) {
    if (user.role !== 'teacher') return null
    return this.teacherSchoolService.schoolIdFor(user)
  }
}
