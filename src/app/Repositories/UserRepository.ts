import { and, asc, eq, inArray, ne, or, sql } from 'drizzle-orm'
import { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/database/schema'

export type StudentProfileChanges = Pick<
  typeof schema.studentProfiles.$inferInsert,
  | 'fullName'
  | 'gender'
  | 'dob'
  | 'heightCm'
  | 'weightKg'
  | 'medicalNotes'
  | 'guardianName'
  | 'guardianPhone'
>

export class UserRepository {
  private db
  private readonly d1: D1Database

  constructor(d1: D1Database) {
    this.d1 = d1
    this.db = drizzle(d1, { schema })
  }

  public async findByLoginIdentifier(identifier: string) {
    const normalizedIdentifier = identifier.toLowerCase()
    const results = await this.db
      .select()
      .from(schema.users)
      .where(
        or(
          sql`lower(${schema.users.username}) = ${normalizedIdentifier}`,
          sql`lower(${schema.users.email}) = ${normalizedIdentifier}`,
        ),
      )
      .limit(1)
    return results[0] ?? null
  }

  public async findExistingLoginIdentifiers(identifiers: string[]) {
    if (identifiers.length === 0) return []
    return this.db.select({ username: schema.users.username, email: schema.users.email }).from(schema.users)
      .where(or(inArray(schema.users.username, identifiers), inArray(schema.users.email, identifiers)))
      .limit(identifiers.length)
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
      .orderBy(asc(schema.teacherProfiles.id))
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

  public async getStudentProfileForSchool(userId: number, schoolId: number) {
    const results = await this.db
      .select({
        userId: schema.users.id,
        username: schema.users.username,
        status: schema.users.status,
        studentIdNum: schema.studentProfiles.studentIdNum,
        fullName: schema.studentProfiles.fullName,
        gender: schema.studentProfiles.gender,
        dob: schema.studentProfiles.dob,
        heightCm: schema.studentProfiles.heightCm,
        weightKg: schema.studentProfiles.weightKg,
        medicalNotes: schema.studentProfiles.medicalNotes,
        guardianName: schema.studentProfiles.guardianName,
        guardianPhone: schema.studentProfiles.guardianPhone,
      })
      .from(schema.studentProfiles)
      .innerJoin(schema.users, eq(schema.studentProfiles.userId, schema.users.id))
      .where(
        and(
          eq(schema.studentProfiles.userId, userId),
          eq(schema.studentProfiles.schoolId, schoolId),
          eq(schema.users.role, 'student'),
        ),
      )
      .limit(1)
    return results[0] ?? null
  }

  public async getStudentProfileByStudentIdNum(schoolId: number, studentIdNum: string) {
    const rows = await this.db
      .select({
        userId: schema.users.id,
        username: schema.users.username,
        status: schema.users.status,
        studentIdNum: schema.studentProfiles.studentIdNum,
        fullName: schema.studentProfiles.fullName,
        gender: schema.studentProfiles.gender,
        dob: schema.studentProfiles.dob,
        heightCm: schema.studentProfiles.heightCm,
        weightKg: schema.studentProfiles.weightKg,
        medicalNotes: schema.studentProfiles.medicalNotes,
        guardianName: schema.studentProfiles.guardianName,
        guardianPhone: schema.studentProfiles.guardianPhone,
      })
      .from(schema.studentProfiles)
      .innerJoin(schema.users, eq(schema.studentProfiles.userId, schema.users.id))
      .where(
        and(
          eq(schema.studentProfiles.schoolId, schoolId),
          eq(schema.studentProfiles.studentIdNum, studentIdNum),
          eq(schema.users.role, 'student'),
        ),
      )
      .limit(1)
    return rows[0] ?? null
  }

  public async updateStudentProfileForSchool(
    schoolId: number,
    userId: number,
    changes: Partial<StudentProfileChanges>,
  ) {
    const updated = await this.db
      .update(schema.studentProfiles)
      .set({ ...changes, updatedAt: new Date() })
      .where(and(eq(schema.studentProfiles.schoolId, schoolId), eq(schema.studentProfiles.userId, userId)))
      .returning({
        userId: schema.studentProfiles.userId,
        studentIdNum: schema.studentProfiles.studentIdNum,
        fullName: schema.studentProfiles.fullName,
      })
    return updated[0] ?? null
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

  public async updateTeacherProfileForSchool(userId: number, schoolId: number, fullName: string, phone: string, email: string) {
    const now = Math.floor(Date.now() / 1000)
    const result = await this.d1.batch([
      this.d1.prepare(`UPDATE smartfit_app_users SET email = ?, username = ?, updated_at = ?
        WHERE id = ? AND role = 'teacher' AND status = 'active'
          AND EXISTS (SELECT 1 FROM teacher_profiles WHERE id = (SELECT id FROM teacher_profiles WHERE user_id = ? ORDER BY id LIMIT 1) AND school_id = ?)
          AND NOT EXISTS (SELECT 1 FROM smartfit_app_users other WHERE other.id <> ? AND (lower(other.email) = lower(?) OR lower(other.username) = lower(?)))`)
        .bind(email, email, now, userId, userId, schoolId, userId, email, email),
      this.d1.prepare(`UPDATE teacher_profiles SET full_name = ?, phone = ?, updated_at = ?
        WHERE id = (SELECT id FROM teacher_profiles WHERE user_id = ? ORDER BY id LIMIT 1)
          AND school_id = ? AND changes() = 1`)
        .bind(fullName, phone || null, now, userId, schoolId),
    ])
    return (result[0]?.meta.changes ?? 0) === 1 && (result[1]?.meta.changes ?? 0) === 1
  }
}
