import { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/database/schema'
import { desc } from 'drizzle-orm'

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
}
