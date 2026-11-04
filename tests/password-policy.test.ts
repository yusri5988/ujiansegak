import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: null as {
    id: number
    username: string
    passwordHash: string
    role: 'student'
    status: 'active'
  } | null,
  updatedPasswordHash: null as string | null,
}))

vi.mock('@/app/Services/AppServiceProvider', () => ({
  authServiceFrom: () => ({
    authenticate: async (token: string) => {
      const { Hash: tokenHelper } = await import('@/helpers/Hash')
      const payload = tokenHelper.parseToken(token)
      if (!payload || mocks.user?.id !== payload.userId) return null
      return {
        user: { id: payload.userId, username: mocks.user.username, role: 'student' as const },
        jti: 'test-session-jti',
      }
    },
    updatePassword: async (_userId: number, currentPassword: string, newPassword: string) => {
      const { Hash: passwordHelper } = await import('@/helpers/Hash')
      if (!mocks.user || !(await passwordHelper.verify(currentPassword, mocks.user.passwordHash))) return
      mocks.updatedPasswordHash = await passwordHelper.makeSecure(newPassword)
    },
  }),
  userRepoFrom: () => ({
    findById: async (userId: number) => (mocks.user?.id === userId ? mocks.user : null),
    updatePassword: async (_userId: number, passwordHash: string) => {
      mocks.updatedPasswordHash = passwordHash
    },
  }),
  auditRepoFrom: () => ({ log: async () => undefined }),
}))

import app from '../src/app/app'
import { resetPasswordSchema } from '../src/app/Requests/AuthRequests'
import { updatePasswordSchema } from '../src/app/Requests/ProfileRequests'
import { createTeacherSchema, storeUserSchema } from '../src/app/Requests/UserRequest'
import { Hash } from '../src/helpers/Hash'

describe('six-character password policy', () => {
  it('accepts six characters and rejects shorter registration passwords', () => {
    const user = { name: 'Murid', email: 'murid@example.com', password: '123456' }
    const teacher = { schoolId: 1, fullName: 'Cikgu', email: 'cikgu@example.com', password: '123456' }

    expect(storeUserSchema.safeParse(user).success).toBe(true)
    expect(storeUserSchema.safeParse({ ...user, password: '12345' }).success).toBe(false)
    expect(createTeacherSchema.safeParse(teacher).success).toBe(true)
    expect(createTeacherSchema.safeParse({ ...teacher, password: '12345' }).success).toBe(false)
  })

  it('applies the same six-character minimum to self-service changes and teacher resets', () => {
    expect(updatePasswordSchema.safeParse({ currentPassword: '123456', newPassword: '654321' }).success).toBe(true)
    expect(updatePasswordSchema.safeParse({ currentPassword: '123456', newPassword: '12345' }).success).toBe(false)
    expect(resetPasswordSchema.safeParse({ userId: 1, newPassword: '654321' }).success).toBe(true)
    expect(resetPasswordSchema.safeParse({ userId: 1, newPassword: '12345' }).success).toBe(false)
  })

  it('stores the shared 123456 hash for every seeded account', async () => {
    const seed = readFileSync(new URL('../src/database/seeders/seed.sql', import.meta.url), 'utf8')
    const hashes = [...seed.matchAll(/'([a-f0-9]{64})', '(?:admin|teacher|student)', 'active'/g)].map(
      (match) => match[1],
    )

    expect(hashes).toHaveLength(7)
    for (const hash of hashes) {
      expect(hash).toBe(await Hash.make('123456'))
    }
  })
})

describe('student password change endpoint', () => {
  beforeEach(async () => {
    mocks.user = {
      id: 7,
      username: 'M1001',
      passwordHash: await Hash.make('123456'),
      role: 'student',
      status: 'active',
    }
    mocks.updatedPasswordHash = null
  })

  it('allows an authenticated student to change their password', async () => {
    const token = Hash.generateToken({ userId: 7, username: 'M1001', role: 'student' })
    const response = await app.request('http://localhost/api/auth/password', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword: '123456', newPassword: '654321' }),
    })

    expect(response.status).toBe(200)
    const updatedHash = mocks.updatedPasswordHash
    expect(updatedHash).not.toBeNull()
    if (!updatedHash) throw new Error('Kata laluan murid tidak dikemas kini.')
    expect(await Hash.verify('654321', updatedHash)).toBe(true)
  })

  it('rejects a new password shorter than six characters', async () => {
    const token = Hash.generateToken({ userId: 7, username: 'M1001', role: 'student' })
    const response = await app.request('http://localhost/api/auth/password', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword: '123456', newPassword: '12345' }),
    })

    expect(response.status).toBe(422)
    expect(mocks.updatedPasswordHash).toBeNull()
  })
})
