import { and, eq, ne, or } from 'drizzle-orm'
import { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/database/schema'

export class UserRepository {
  private db

  constructor(d1: D1Database) {
    this.db = drizzle(d1, { schema })
  }

  public async findByUsername(username: string) {
    const results = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1)
    return results[0] ?? null
  }

  public async findById(id: number) {
    const results = await this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1)
    return results[0] ?? null
  }

  public async createUser(data: schema.NewUserRow) {
    const inserted = await this.db.insert(schema.users).values(data).returning()
    return inserted[0]
  }

  public async createTeacherProfile(data: typeof schema.teacherProfiles.$inferInsert) {
    const inserted = await this.db.insert(schema.teacherProfiles).values(data).returning()
    return inserted[0]
  }

  public async createStudentProfile(data: typeof schema.studentProfiles.$inferInsert) {
    const inserted = await this.db.insert(schema.studentProfiles).values(data).returning()
    return inserted[0]
  }

  public async getTeacherProfile(userId: number) {
    const results = await this.db
      .select()
      .from(schema.teacherProfiles)
      .where(eq(schema.teacherProfiles.userId, userId))
      .limit(1)
    return results[0] ?? null
  }

  public async getStudentProfile(userId: number) {
    const results = await this.db
      .select()
      .from(schema.studentProfiles)
      .where(eq(schema.studentProfiles.userId, userId))
      .limit(1)
    return results[0] ?? null
  }

  public async updatePassword(userId: number, passwordHash: string) {
    await this.db
      .update(schema.users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
  }

  public async emailExists(email: string, exceptUserId: number) {
    const results = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(
          ne(schema.users.id, exceptUserId),
          or(eq(schema.users.email, email), eq(schema.users.username, email))
        )
      )
      .limit(1)

    return results.length > 0
  }

  public async updateEmail(userId: number, email: string, updateUsername: boolean) {
    await this.db
      .update(schema.users)
      .set({
        email,
        ...(updateUsername ? { username: email } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
  }

  public async updateTeacherProfile(userId: number, data: Partial<{ fullName: string; phone: string }>) {
    const updates: Record<string, unknown> = {}
    if (data.fullName !== undefined) updates.fullName = data.fullName
    if (data.phone !== undefined) updates.phone = data.phone
    updates.updatedAt = new Date()
    await this.db
      .update(schema.teacherProfiles)
      .set(updates)
      .where(eq(schema.teacherProfiles.userId, userId))
  }
}
