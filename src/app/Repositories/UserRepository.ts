import { eq } from 'drizzle-orm'
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
}
