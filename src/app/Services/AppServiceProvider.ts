import { createFactory } from 'hono/factory'
import type { AppEnv } from '@/app/Env'
import { UserRepository } from '@/app/Repositories/UserRepository'
import { SchoolRepository } from '@/app/Repositories/SchoolRepository'
import { ClassRepository } from '@/app/Repositories/ClassRepository'
import { TrainingRepository } from '@/app/Repositories/TrainingRepository'
import { SegakRepository } from '@/app/Repositories/SegakRepository'
import { AuditRepository } from '@/app/Repositories/AuditRepository'
import { BmiCalculationService } from '@/app/Services/BmiCalculationService'
import { SegakScoringService } from '@/app/Services/SegakScoringService'
import { ClassService } from '@/app/Services/ClassService'
import { TrainingService } from '@/app/Services/TrainingService'
import { AuthRepository } from '@/app/Repositories/AuthRepository'
import { AuthService } from '@/app/Services/AuthService'
import { AiChatRepository } from '@/app/Repositories/AiChatRepository'
import { AiToolService } from '@/app/Services/AiToolService'
import { AiChatService } from '@/app/Services/AiChatService'
import { DeepSeekService } from '@/app/Services/DeepSeekService'
import { PasswordService } from '@/app/Services/PasswordService'
import { TeacherSchoolService } from '@/app/Services/TeacherSchoolService'
import { SegakService } from '@/app/Services/SegakService'

export const factory = createFactory<AppEnv>()

export function userRepoFrom(env: AppEnv['Bindings']) {
  return new UserRepository(env.DB)
}

export function authRepoFrom(env: AppEnv['Bindings']) {
  return new AuthRepository(env.DB)
}

export function authServiceFrom(env: AppEnv['Bindings']) {
  return new AuthService(
    userRepoFrom(env),
    authRepoFrom(env),
    classRepoFrom(env),
    auditRepoFrom(env),
    passwordServiceFrom(),
    env.JWT_SECRET,
  )
}

export function passwordServiceFrom() {
  return new PasswordService()
}

export function teacherSchoolServiceFrom(env: AppEnv['Bindings']) {
  return new TeacherSchoolService(
    userRepoFrom(env),
    classRepoFrom(env),
    schoolRepoFrom(env),
    classServiceFrom(env),
    authServiceFrom(env),
    auditRepoFrom(env),
    passwordServiceFrom(),
  )
}

export function segakServiceFrom(env: AppEnv['Bindings']) {
  return new SegakService(
    segakRepoFrom(env),
    classRepoFrom(env),
    schoolRepoFrom(env),
    userRepoFrom(env),
    bmiServiceFrom(),
    segakScoringServiceFrom(),
    auditRepoFrom(env),
  )
}

export function aiChatRepoFrom(env: AppEnv['Bindings']) {
  return new AiChatRepository(env.DB)
}

export function aiChatServiceFrom(env: AppEnv['Bindings']) {
  return new AiChatService(
    aiChatRepoFrom(env),
    new DeepSeekService(env.DEEPSEEK_API_KEY, env.DEEPSEEK_MODEL),
    new AiToolService(
      classRepoFrom(env),
      trainingServiceFrom(env),
      userRepoFrom(env),
      segakRepoFrom(env),
      teacherSchoolServiceFrom(env),
      segakServiceFrom(env),
    ),
    auditRepoFrom(env),
  )
}

export function schoolRepoFrom(env: AppEnv['Bindings']) {
  return new SchoolRepository(env.DB)
}

export function classRepoFrom(env: AppEnv['Bindings']) {
  return new ClassRepository(env.DB)
}

export function classServiceFrom(env: AppEnv['Bindings']) {
  return new ClassService(classRepoFrom(env), schoolRepoFrom(env), userRepoFrom(env))
}

export function trainingRepoFrom(env: AppEnv['Bindings']) {
  return new TrainingRepository(env.DB)
}

export function trainingServiceFrom(env: AppEnv['Bindings']) {
  return new TrainingService(trainingRepoFrom(env), classRepoFrom(env), auditRepoFrom(env))
}

export function segakRepoFrom(env: AppEnv['Bindings']) {
  return new SegakRepository(env.DB)
}

export function auditRepoFrom(env: AppEnv['Bindings']) {
  return new AuditRepository(env.DB)
}

export function bmiServiceFrom() {
  return new BmiCalculationService()
}

export function segakScoringServiceFrom() {
  return new SegakScoringService()
}
