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

export const factory = createFactory<AppEnv>()

export function userRepoFrom(env: AppEnv['Bindings']) {
  return new UserRepository(env.DB)
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
