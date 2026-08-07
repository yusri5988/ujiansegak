import { eq } from 'drizzle-orm'
import { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/database/schema'

export class SchoolRepository {
  private db

  constructor(d1: D1Database) {
    this.db = drizzle(d1, { schema })
  }

  public async findAll() {
    return await this.db.select().from(schema.schools)
  }

  public async findById(id: number) {
    const results = await this.db.select().from(schema.schools).where(eq(schema.schools.id, id)).limit(1)
    return results[0] ?? null
  }

  public async create(data: schema.NewSchoolRow) {
    const inserted = await this.db.insert(schema.schools).values(data).returning()
    return inserted[0]
  }

  public async update(id: number, data: Partial<schema.NewSchoolRow>) {
    const updated = await this.db
      .update(schema.schools)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.schools.id, id))
      .returning()
    return updated[0]
  }
}
