import { eq, and, asc, sql } from 'drizzle-orm'
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/database/schema'

export type SchoolStudentCreate = Pick<typeof schema.studentProfiles.$inferInsert, 'studentIdNum' | 'fullName' | 'gender' | 'dob' | 'heightCm' | 'weightKg' | 'medicalNotes' | 'guardianName' | 'guardianPhone'>

export class ClassRepository {
  private db
  private readonly d1: D1Database

  constructor(d1: D1Database) {
    this.d1 = d1
    this.db = drizzle(d1, { schema })
  }

  public async findByTeacher(teacherId: number, limit = 50) {
    return await this.db
      .select()
      .from(schema.classes)
      .where(and(eq(schema.classes.teacherId, teacherId), eq(schema.classes.status, 'active')))
      .orderBy(asc(schema.classes.id))
      .limit(limit)
  }

  public async findBySchool(schoolId: number, limit = 100) {
    return await this.db
      .select()
      .from(schema.classes)
      .where(and(eq(schema.classes.schoolId, schoolId), eq(schema.classes.status, 'active')))
      .orderBy(asc(schema.classes.name), asc(schema.classes.id))
      .limit(limit)
  }

  public async findById(id: number) {
    const results = await this.db.select().from(schema.classes).where(eq(schema.classes.id, id)).limit(1)
    return results[0] ?? null
  }

  public async findByIdForTeacher(id: number, teacherId: number) {
    const results = await this.db
      .select()
      .from(schema.classes)
      .where(and(eq(schema.classes.id, id), eq(schema.classes.teacherId, teacherId)))
      .limit(1)
    return results[0] ?? null
  }

  public async findByIdForSchool(id: number, schoolId: number) {
    const results = await this.db
      .select()
      .from(schema.classes)
      .where(and(eq(schema.classes.id, id), eq(schema.classes.schoolId, schoolId)))
      .limit(1)
    return results[0] ?? null
  }

  public async studentBelongsToTeacher(studentId: number, teacherId: number) {
    const rows = await this.db
      .select({ classStudentId: schema.classStudents.id })
      .from(schema.classStudents)
      .innerJoin(schema.classes, eq(schema.classStudents.classId, schema.classes.id))
      .where(
        and(
          eq(schema.classStudents.studentId, studentId),
          eq(schema.classStudents.status, 'active'),
          eq(schema.classes.teacherId, teacherId),
          eq(schema.classes.status, 'active'),
        ),
      )
      .limit(1)
    return rows.length > 0
  }

  public async createClass(data: typeof schema.classes.$inferInsert) {
    const inserted = await this.db.insert(schema.classes).values(data).returning()
    return inserted[0]
  }

  public async updateClassForSchool(classId: number, schoolId: number, name: string) {
    const updated = await this.db
      .update(schema.classes)
      .set({ name, updatedAt: new Date() })
      .where(and(eq(schema.classes.id, classId), eq(schema.classes.schoolId, schoolId), eq(schema.classes.status, 'active')))
      .returning()
    return updated[0] ?? null
  }

  public async archiveClassForSchool(classId: number, schoolId: number) {
    const updated = await this.db
      .update(schema.classes)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(and(eq(schema.classes.id, classId), eq(schema.classes.schoolId, schoolId), eq(schema.classes.status, 'active')))
      .returning()
    return updated[0] ?? null
  }

  public async addStudentToClass(classId: number, studentId: number) {
    const inserted = await this.db
      .insert(schema.classStudents)
      .values({ classId, studentId, status: 'active' })
      .returning()
    return inserted[0]
  }

  public async createStudentForSchool(
    classId: number,
    schoolId: number,
    profile: Pick<
      typeof schema.studentProfiles.$inferInsert,
      | 'studentIdNum'
      | 'fullName'
      | 'gender'
      | 'dob'
      | 'heightCm'
      | 'weightKg'
      | 'medicalNotes'
      | 'guardianName'
      | 'guardianPhone'
    >,
    passwordHash: string,
  ) {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const studentIdNum = profile.studentIdNum
    const results = await this.d1.batch([
      this.d1
        .prepare(
          `INSERT INTO smartfit_app_users (username, password_hash, role, status, created_at, updated_at)
           SELECT ?, ?, 'student', 'active', ?, ?
           WHERE EXISTS (SELECT 1 FROM classes WHERE id = ? AND school_id = ? AND status = 'active')`,
        )
        .bind(studentIdNum, passwordHash, nowSeconds, nowSeconds, classId, schoolId),
      this.d1
        .prepare(
          `INSERT INTO student_profiles
            (user_id, school_id, student_id_num, full_name, gender, dob, height_cm, weight_kg,
             medical_notes, guardian_name, guardian_phone, created_at, updated_at)
           SELECT last_insert_rowid(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM classes WHERE id = ? AND school_id = ? AND status = 'active')`,
        )
        .bind(
          schoolId,
          studentIdNum,
          profile.fullName,
          profile.gender,
          profile.dob,
          profile.heightCm ?? null,
          profile.weightKg ?? null,
          profile.medicalNotes ?? null,
          profile.guardianName ?? null,
          profile.guardianPhone ?? null,
          nowSeconds,
          nowSeconds,
          classId,
          schoolId,
        ),
      this.d1
        .prepare(
          `INSERT INTO class_students (class_id, student_id, status, created_at, updated_at)
           SELECT classes.id, student_profiles.user_id, 'active', ?, ?
           FROM classes
           INNER JOIN student_profiles ON student_profiles.school_id = classes.school_id
           WHERE classes.id = ? AND classes.school_id = ? AND classes.status = 'active'
             AND student_profiles.student_id_num = ?
             AND student_profiles.user_id = (
                SELECT id FROM smartfit_app_users
               WHERE username = ? AND password_hash = ? AND created_at = ?
             )`,
        )
        .bind(nowSeconds, nowSeconds, classId, schoolId, studentIdNum, studentIdNum, passwordHash, nowSeconds),
    ])

    if (results[0]?.meta.changes !== 1 || results[1]?.meta.changes !== 1 || results[2]?.meta.changes !== 1) {
      return null
    }

    const user = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(eq(schema.users.username, studentIdNum), eq(schema.users.passwordHash, passwordHash)))
      .limit(1)
    return user[0]?.id ?? null
  }

  public async createStudentsForSchool(classId: number, schoolId: number, students: Array<{ profile: SchoolStudentCreate; passwordHash: string }>) {
    const now = Math.floor(Date.now() / 1000)
    const statements: D1PreparedStatement[] = []
    for (const { profile, passwordHash } of students) {
      statements.push(
        this.d1.prepare(`INSERT INTO smartfit_app_users (username, password_hash, role, status, created_at, updated_at)
          SELECT ?, ?, 'student', 'active', ?, ? WHERE EXISTS (SELECT 1 FROM classes WHERE id = ? AND school_id = ? AND status = 'active')`)
          .bind(profile.studentIdNum, passwordHash, now, now, classId, schoolId),
        this.d1.prepare(`INSERT INTO student_profiles (user_id, school_id, student_id_num, full_name, gender, dob, created_at, updated_at)
          SELECT last_insert_rowid(), ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM classes WHERE id = ? AND school_id = ? AND status = 'active')`)
          .bind(schoolId, profile.studentIdNum, profile.fullName, profile.gender, profile.dob, now, now, classId, schoolId),
        this.d1.prepare(`INSERT INTO class_students (class_id, student_id, status, created_at, updated_at)
          SELECT classes.id, student_profiles.user_id, 'active', ?, ? FROM classes
          INNER JOIN student_profiles ON student_profiles.school_id = classes.school_id
          WHERE classes.id = ? AND classes.school_id = ? AND classes.status = 'active'
            AND student_profiles.student_id_num = ? AND student_profiles.user_id =
              (SELECT id FROM smartfit_app_users WHERE username = ? AND password_hash = ? AND created_at = ?)`)
          .bind(now, now, classId, schoolId, profile.studentIdNum, profile.studentIdNum, passwordHash, now),
      )
    }
    const results = await this.d1.batch(statements)
    return results.every((result) => result.meta.changes === 1)
  }

  public async dropStudentFromClassForSchool(classId: number, schoolId: number, studentId: number) {
    const updated = await this.d1
      .prepare(
        `UPDATE class_students SET status = 'dropped', updated_at = ?
         WHERE class_id = ? AND student_id = ? AND status = 'active'
           AND class_id IN (
             SELECT id FROM classes WHERE id = ? AND school_id = ? AND status = 'active'
           )`,
      )
      .bind(Math.floor(Date.now() / 1000), classId, studentId, classId, schoolId)
      .run()
    return updated.meta.changes > 0
  }

  public async transferStudentForSchool(fromClassId: number, toClassId: number, schoolId: number, studentId: number) {
    const now = Math.floor(Date.now() / 1000)
    const result = await this.d1.batch([
      this.d1.prepare(`UPDATE class_students SET status = 'transferred', updated_at = ?
        WHERE class_id = ? AND student_id = ? AND status = 'active'
          AND EXISTS (SELECT 1 FROM classes WHERE id = ? AND school_id = ? AND status = 'active')
          AND EXISTS (SELECT 1 FROM classes WHERE id = ? AND school_id = ? AND status = 'active')
          AND EXISTS (SELECT 1 FROM student_profiles WHERE user_id = ? AND school_id = ?)
          AND NOT EXISTS (SELECT 1 FROM class_students WHERE class_id = ? AND student_id = ? AND status = 'active')`)
        .bind(now, fromClassId, studentId, fromClassId, schoolId, toClassId, schoolId, studentId, schoolId, toClassId, studentId),
      this.d1.prepare(`INSERT INTO class_students (class_id, student_id, status, created_at, updated_at)
        SELECT ?, ?, 'active', ?, ? WHERE changes() = 1`)
        .bind(toClassId, studentId, now, now),
    ])
    return (result[0]?.meta.changes ?? 0) === 1 && (result[1]?.meta.changes ?? 0) === 1
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

  public async getClassStudentNamesForTeacher(classId: number, teacherId: number, limit = 101) {
    return await this.db
      .select({ fullName: schema.studentProfiles.fullName })
      .from(schema.classStudents)
      .innerJoin(schema.classes, eq(schema.classStudents.classId, schema.classes.id))
      .innerJoin(schema.users, eq(schema.classStudents.studentId, schema.users.id))
      .innerJoin(schema.studentProfiles, eq(schema.users.id, schema.studentProfiles.userId))
      .where(
        and(
          eq(schema.classes.id, classId),
          eq(schema.classes.teacherId, teacherId),
          eq(schema.classes.status, 'active'),
          eq(schema.classStudents.status, 'active'),
          eq(schema.users.role, 'student'),
          eq(schema.users.status, 'active'),
        ),
      )
      .orderBy(asc(schema.studentProfiles.fullName), asc(schema.studentProfiles.studentIdNum))
      .limit(limit)
  }

  public async getClassStudentNamesForSchool(classId: number, schoolId: number, limit = 101) {
    return await this.db
      .select({ fullName: schema.studentProfiles.fullName, studentIdNum: schema.studentProfiles.studentIdNum })
      .from(schema.classStudents)
      .innerJoin(schema.classes, eq(schema.classStudents.classId, schema.classes.id))
      .innerJoin(schema.users, eq(schema.classStudents.studentId, schema.users.id))
      .innerJoin(schema.studentProfiles, eq(schema.users.id, schema.studentProfiles.userId))
      .where(
        and(
          eq(schema.classes.id, classId),
          eq(schema.classes.schoolId, schoolId),
          eq(schema.classes.status, 'active'),
          eq(schema.classStudents.status, 'active'),
          eq(schema.users.role, 'student'),
          eq(schema.users.status, 'active'),
          eq(schema.studentProfiles.schoolId, schoolId),
        ),
      )
      .orderBy(asc(schema.studentProfiles.fullName), asc(schema.studentProfiles.studentIdNum))
      .limit(limit)
  }

  public async countClassStudentsForSchool(classId: number, schoolId: number) {
    const rows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.classStudents)
      .innerJoin(schema.classes, eq(schema.classStudents.classId, schema.classes.id))
      .innerJoin(schema.users, eq(schema.classStudents.studentId, schema.users.id))
      .innerJoin(schema.studentProfiles, eq(schema.users.id, schema.studentProfiles.userId))
      .where(
        and(
          eq(schema.classes.id, classId),
          eq(schema.classes.schoolId, schoolId),
          eq(schema.classStudents.status, 'active'),
          eq(schema.users.role, 'student'),
          eq(schema.users.status, 'active'),
          eq(schema.studentProfiles.schoolId, schoolId),
        ),
      )
    return rows[0]?.count ?? 0
  }

  public async getClassStudentIdsForSchool(classId: number, schoolId: number, limit = 1000) {
    const rows = await this.db
      .select({ studentUserId: schema.users.id })
      .from(schema.classes)
      .innerJoin(schema.classStudents, eq(schema.classStudents.classId, schema.classes.id))
      .innerJoin(schema.users, eq(schema.classStudents.studentId, schema.users.id))
      .innerJoin(schema.studentProfiles, eq(schema.users.id, schema.studentProfiles.userId))
      .where(
        and(
          eq(schema.classes.id, classId),
          eq(schema.classes.schoolId, schoolId),
          eq(schema.classStudents.status, 'active'),
          eq(schema.users.role, 'student'),
          eq(schema.users.status, 'active'),
          eq(schema.studentProfiles.schoolId, schoolId),
        ),
      )
      .orderBy(asc(schema.users.id))
      .limit(limit)
    return rows.map((row) => row.studentUserId)
  }

  public async studentBelongsToSchool(studentId: number, schoolId: number) {
    const rows = await this.db
      .select({ classStudentId: schema.classStudents.id })
      .from(schema.classStudents)
      .innerJoin(schema.classes, eq(schema.classStudents.classId, schema.classes.id))
      .where(
        and(
          eq(schema.classStudents.studentId, studentId),
          eq(schema.classStudents.status, 'active'),
          eq(schema.classes.schoolId, schoolId),
          eq(schema.classes.status, 'active'),
        ),
      )
      .limit(1)
    return rows.length > 0
  }

  public async hasActiveStudentInClassForSchool(classId: number, schoolId: number, studentId: number) {
    const rows = await this.db.select({ id: schema.classStudents.id }).from(schema.classStudents)
      .innerJoin(schema.classes, eq(schema.classStudents.classId, schema.classes.id))
      .where(and(eq(schema.classStudents.classId, classId), eq(schema.classes.schoolId, schoolId), eq(schema.classes.status, 'active'), eq(schema.classStudents.studentId, studentId), eq(schema.classStudents.status, 'active'))).limit(1)
    return rows.length > 0
  }
}
