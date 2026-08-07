import { Context } from 'hono'
import type { AppEnv } from '@/app/Env'
import { classRepoFrom, userRepoFrom, auditRepoFrom } from '@/app/Services/AppServiceProvider'
import { Hash } from '@/helpers/Hash'

export class ClassController {
  public static async getTeacherClasses(c: Context<AppEnv>) {
    const user = c.get('user')!
    const classRepo = classRepoFrom(c.env)
    const classes = await classRepo.findByTeacher(user.id)
    return c.json({ success: true, data: classes })
  }

  public static async createClass(c: Context<AppEnv>) {
    const user = c.get('user')!
    const { schoolId, academicSessionId, name } = await c.req.json()
    const classRepo = classRepoFrom(c.env)

    const newClass = await classRepo.createClass({
      schoolId,
      academicSessionId,
      teacherId: user.id,
      name,
      status: 'active',
    })

    return c.json({ success: true, data: newClass })
  }

  public static async getClassStudents(c: Context<AppEnv>) {
    const classId = Number(c.req.param('id'))
    const classRepo = classRepoFrom(c.env)
    const students = await classRepo.getClassStudents(classId)
    return c.json({ success: true, data: students })
  }

  public static async addStudent(c: Context<AppEnv>) {
    const user = c.get('user')!
    const { schoolId, classId, studentIdNum, fullName, gender, dob, heightCm, weightKg, guardianName, guardianPhone } = await c.req.json()

    const userRepo = userRepoFrom(c.env)
    const classRepo = classRepoFrom(c.env)
    const auditRepo = auditRepoFrom(c.env)

    const passwordHash = await Hash.make('Murid1234!')
    const newUser = await userRepo.createUser({
      username: studentIdNum,
      passwordHash,
      role: 'student',
      status: 'active',
    })

    if (!newUser) throw new Error('Gagal mencipta pengguna murid')

    const studentProfile = await userRepo.createStudentProfile({
      userId: newUser.id,
      schoolId,
      studentIdNum,
      fullName,
      gender,
      dob,
      heightCm,
      weightKg,
      guardianName,
      guardianPhone,
    })

    await classRepo.addStudentToClass(classId, newUser.id)

    await auditRepo.log({
      userId: user.id,
      action: 'ADD_STUDENT',
      entityType: 'STUDENT',
      entityId: String(newUser.id),
      details: `Murid ${fullName} (${studentIdNum}) didaftarkan ke dalam kelas.`,
    })

    return c.json({ success: true, data: { user: newUser, profile: studentProfile } })
  }

  public static async importStudentsCsv(c: Context<AppEnv>) {
    const user = c.get('user')!
    const { schoolId, classId, students } = await c.req.json()

    const userRepo = userRepoFrom(c.env)
    const classRepo = classRepoFrom(c.env)
    const auditRepo = auditRepoFrom(c.env)

    const createdList = []
    const defaultPasswordHash = await Hash.make('Murid1234!')

    for (const item of students) {
      try {
        const newUser = await userRepo.createUser({
          username: item.studentIdNum,
          passwordHash: defaultPasswordHash,
          role: 'student',
          status: 'active',
        })

        if (newUser) {
          await userRepo.createStudentProfile({
            userId: newUser.id,
            schoolId,
            studentIdNum: item.studentIdNum,
            fullName: item.fullName,
            gender: item.gender,
            dob: item.dob,
          })

          await classRepo.addStudentToClass(classId, newUser.id)
          createdList.push(item.fullName)
        }
      } catch {
        // Abaikan ralat jika wujud ralat pendaftaran
      }
    }

    await auditRepo.log({
      userId: user.id,
      action: 'IMPORT_STUDENTS_CSV',
      entityType: 'CLASS',
      entityId: String(classId),
      details: `Sebanyak ${createdList.length} murid berjaya diimport ke kelas ID ${classId}.`,
    })

    return c.json({
      success: true,
      message: `Berjaya mengimport ${createdList.length} murid`,
      data: createdList,
    })
  }

  public static async resetStudentPassword(c: Context<AppEnv>) {
    const { userId, newPassword } = await c.req.json()
    const userRepo = userRepoFrom(c.env)
    const passwordHash = await Hash.make(newPassword || 'Murid1234!')
    await userRepo.updatePassword(userId, passwordHash)

    return c.json({ success: true, message: 'Kata laluan murid berjaya dikemaskini.' })
  }
}
