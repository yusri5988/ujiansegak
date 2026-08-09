import { Context } from 'hono'
import type { AppEnv } from '@/app/Env'
import { userRepoFrom, auditRepoFrom } from '@/app/Services/AppServiceProvider'
import { Hash } from '@/helpers/Hash'
import { eq } from 'drizzle-orm'
import * as schema from '@/database/schema'
import { drizzle } from 'drizzle-orm/d1'
import type { UpdateProfileInput } from '@/app/Requests/ProfileRequests'

export class ProfileController {
  /**
   * Get current user's profile (teacher or student)
   */
  public static async getProfile(c: Context<AppEnv>) {
    const authUser = c.get('user')
    if (!authUser) {
      return c.json({ success: false, message: 'Tidak diotentikasi' }, 401)
    }

    const userRepo = userRepoFrom(c.env)
    
    // Get base user info
    const user = await userRepo.findById(authUser.id)
    if (!user) {
      return c.json({ success: false, message: 'Pengguna tidak ditemui' }, 404)
    }

    // Get profile based on role
    let profile = null
    if (user.role === 'teacher') {
      profile = await userRepo.getTeacherProfile(user.id)
    } else if (user.role === 'student') {
      profile = await userRepo.getStudentProfile(user.id)
    }

    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        profile,
      },
    })
  }

  /**
   * Update teacher/student profile
   */
  public static async updateProfile(c: Context<AppEnv>) {
    const authUser = c.get('user')
    if (!authUser) {
      return c.json({ success: false, message: 'Tidak diotentikasi' }, 401)
    }

    const { fullName, phone, email } = await c.req.json<UpdateProfileInput>()

    const db = drizzle(c.env.DB, { schema })
    const userRepo = userRepoFrom(c.env)
    const auditRepo = auditRepoFrom(c.env)

    try {
      const normalizedEmail = email.toLowerCase()
      const currentUser = await userRepo.findById(authUser.id)
      if (!currentUser) {
        return c.json({ success: false, message: 'Pengguna tidak ditemui' }, 404)
      }

      if (normalizedEmail !== (currentUser.email || '').toLowerCase()) {
        if (await userRepo.emailExists(normalizedEmail, authUser.id)) {
          return c.json({ success: false, message: 'Email tersebut telah digunakan oleh akaun lain.' }, 409)
        }

        // Teachers and administrators log in with username=email. Student IDs remain unchanged.
        await userRepo.updateEmail(authUser.id, normalizedEmail, currentUser.role !== 'student')
      }

      // Check if profile exists
      const existingProfile = await db
        .select()
        .from(schema.teacherProfiles)
        .where(eq(schema.teacherProfiles.userId, authUser.id))
        .limit(1)

      if (existingProfile.length === 0) {
        // Create new teacher profile
        await db.insert(schema.teacherProfiles).values({
          userId: authUser.id,
          schoolId: 1, // Default school
          fullName,
          phone: phone || null,
        })
      } else {
        // Update existing profile
        const existing = existingProfile[0]
        if (existing) {
          await db
            .update(schema.teacherProfiles)
            .set({
              fullName,
              phone: phone || null,
              updatedAt: new Date(),
            })
            .where(eq(schema.teacherProfiles.userId, authUser.id))
        }
      }

      await auditRepo.log({
        userId: authUser.id,
        action: 'UPDATE_PROFILE',
        entityType: 'USER',
        entityId: String(authUser.id),
        details: `Pengguna telah mengemas kini profil.`,
      })

      return c.json({
        success: true,
        message: 'Profil berjaya dikemaskini',
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      return c.json(
        { success: false, message: 'Gagal mengemas kini profil' },
        500
      )
    }
  }

  /**
   * Update password
   */
  public static async updatePassword(c: Context<AppEnv>) {
    const authUser = c.get('user')
    if (!authUser) {
      return c.json({ success: false, message: 'Tidak diotentikasi' }, 401)
    }

    const body = await c.req.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return c.json(
        { success: false, message: 'Kata laluan semasa dan baru diperlukan' },
        400
      )
    }

    if (newPassword.length < 6) {
      return c.json(
        { success: false, message: 'Kata laluan baru mestilah sekurang-kurangnya 6 aksara' },
        400
      )
    }

    const userRepo = userRepoFrom(c.env)
    const auditRepo = auditRepoFrom(c.env)

    // Get current user
    const user = await userRepo.findById(authUser.id)
    if (!user) {
      return c.json({ success: false, message: 'Pengguna tidak ditemui' }, 404)
    }

    // Verify current password
    const isValidPassword = await Hash.verify(currentPassword, user.passwordHash)
    if (!isValidPassword) {
      return c.json(
        { success: false, message: 'Kata laluan semasa tidak sah' },
        401
      )
    }

    // Generate new hash
    const newHash = await Hash.make(newPassword)

    // Update password
    await userRepo.updatePassword(authUser.id, newHash)

    await auditRepo.log({
      userId: authUser.id,
      action: 'UPDATE_PASSWORD',
      entityType: 'USER',
      entityId: String(authUser.id),
      details: `Pengguna telah menukar kata laluan.`,
    })

    return c.json({
      success: true,
      message: 'Kata laluan berjaya ditukar',
    })
  }
}
