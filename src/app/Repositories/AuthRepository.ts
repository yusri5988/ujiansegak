import { and, eq, gt, isNull } from 'drizzle-orm'
import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/database/schema'

export class AuthRepository {
  private readonly db

  constructor(private readonly d1: D1Database) {
    this.db = drizzle(d1, { schema })
  }

  public async createSession(data: typeof schema.authSessions.$inferInsert) {
    const inserted = await this.db.insert(schema.authSessions).values(data).returning()
    return inserted[0] ?? null
  }

  public async findActiveSession(jti: string, userId: number, now: Date) {
    const rows = await this.db
      .select()
      .from(schema.authSessions)
      .where(
        and(
          eq(schema.authSessions.jti, jti),
          eq(schema.authSessions.userId, userId),
          gt(schema.authSessions.expiresAt, now),
          isNull(schema.authSessions.revokedAt),
        ),
      )
      .limit(1)
    return rows[0] ?? null
  }

  public async revokeSession(jti: string, userId: number, now: Date) {
    const changed = await this.db
      .update(schema.authSessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.authSessions.jti, jti),
          eq(schema.authSessions.userId, userId),
          isNull(schema.authSessions.revokedAt),
        ),
      )
      .returning({ jti: schema.authSessions.jti })
    return changed.length > 0
  }

  public async updatePasswordAndRevokeSessions(userId: number, passwordHash: string, now: Date) {
    const nowSeconds = Math.floor(now.getTime() / 1000)
    const results = await this.d1.batch([
      this.d1
        .prepare('UPDATE smartfit_app_users SET password_hash = ?, updated_at = ? WHERE id = ?')
        .bind(passwordHash, nowSeconds, userId),
      this.d1
        .prepare('UPDATE smartfit_app_auth_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
        .bind(nowSeconds, userId),
    ])
    return (results[0]?.meta.changes ?? 0) > 0
  }
}
