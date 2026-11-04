import { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/database/schema'
import { and, desc, eq, gt, sql } from 'drizzle-orm'

export class AuditRepository {
  private db

  constructor(d1: D1Database) {
    this.db = drizzle(d1, { schema })
  }

  public async log(data: typeof schema.auditLogs.$inferInsert) {
    const inserted = await this.db.insert(schema.auditLogs).values(data).returning()
    return inserted[0]
  }

  public async getRecentLogs(limit = 50) {
    return await this.db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.createdAt)).limit(limit)
  }

  public async countActionForUserSince(userId: number, action: string, since: Date) {
    const rows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.userId, userId),
          eq(schema.auditLogs.action, action),
          gt(schema.auditLogs.createdAt, since),
        ),
      )
    return rows[0]?.count ?? 0
  }
}
