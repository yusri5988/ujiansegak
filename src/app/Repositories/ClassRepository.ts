import { eq, and } from 'drizzle-orm'
import { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/database/schema'

export class ClassRepository {
  private db

  constructor(d1: D1Database) {
    this.db = drizzle(d1, { schema })
  }

  public async findByTeacher(teacherId: number) {
    return await this.db
      .select()
      .from(schema.classes)
      .where(and(eq(schema.classes.teacherId, teacherId), eq(schema.classes.status, 'active')))
  }

  public async findById(id: number) {
    const results = await this.db.select().from(schema.classes).where(eq(schema.classes.id, id)).limit(1)
    return results[0] ?? null
  }

  public async createClass(data: typeof schema.classes.$inferInsert) {
    const inserted = await this.db.insert(schema.classes).values(data).returning()
    return inserted[0]
  }

  public async addStudentToClass(classId: number, studentId: number) {
    const inserted = await this.db
      .insert(schema.classStudents)
      .values({ classId, studentId, status: 'active' })
      .returning()
    return inserted[0]
  }

  public async getClassStudents(classId: number) {
    return await this.db
      .select({
        classStudentId: schema.classStudents.id,
        studentUserId: schema.users.id,
        username: schema.users.username,
        studentIdNum: schema.studentProfiles.studentIdNum,
        fullName: schema.studentProfiles.fullName,
        gender: schema.studentProfiles.gender,
        dob: schema.studentProfiles.dob,
        heightCm: schema.studentProfiles.heightCm,
        weightKg: schema.studentProfiles.weightKg,
      })
      .from(schema.classStudents)
      .innerJoin(schema.users, eq(schema.classStudents.studentId, schema.users.id))
      .innerJoin(schema.studentProfiles, eq(schema.users.id, schema.studentProfiles.userId))
      .where(and(eq(schema.classStudents.classId, classId), eq(schema.classStudents.status, 'active')))
  }
}
