import { and, asc, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm'
import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/database/schema'

export class AiChatRepository {
  private readonly db

  constructor(d1: D1Database) {
    this.db = drizzle(d1, { schema })
  }

  public async createConversation(teacherId: number, title: string) {
    const now = new Date()
    const profiles = await this.db.select({ schoolId: schema.teacherProfiles.schoolId }).from(schema.teacherProfiles).where(eq(schema.teacherProfiles.userId, teacherId)).orderBy(asc(schema.teacherProfiles.id)).limit(1)
    if (!profiles[0]) return null
    const inserted = await this.db
      .insert(schema.aiConversations)
      .values({ id: crypto.randomUUID(), teacherId, schoolId: profiles[0].schoolId, title, createdAt: now, updatedAt: now })
      .returning()
    return inserted[0] ?? null
  }

  public async listConversations(teacherId: number, limit = 20) {
    return this.db
      .select({
        id: schema.aiConversations.id,
        title: schema.aiConversations.title,
        createdAt: schema.aiConversations.createdAt,
        updatedAt: schema.aiConversations.updatedAt,
      })
      .from(schema.aiConversations)
      .where(and(eq(schema.aiConversations.teacherId, teacherId), this.conversationSchool(teacherId)))
      .orderBy(desc(schema.aiConversations.updatedAt), desc(schema.aiConversations.id))
      .limit(limit)
  }

  public async countConversations(teacherId: number) {
    const rows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.aiConversations)
      .where(and(eq(schema.aiConversations.teacherId, teacherId), this.conversationSchool(teacherId)))
    return rows[0]?.count ?? 0
  }

  public async deleteConversationsUpdatedBefore(teacherId: number, cutoff: Date) {
    const deleted = await this.db
      .delete(schema.aiConversations)
      .where(and(eq(schema.aiConversations.teacherId, teacherId), this.conversationSchool(teacherId), lt(schema.aiConversations.updatedAt, cutoff)))
      .returning({ id: schema.aiConversations.id })
    return deleted.length
  }

  public async findConversation(teacherId: number, conversationId: string) {
    const rows = await this.db
      .select()
      .from(schema.aiConversations)
      .where(and(eq(schema.aiConversations.teacherId, teacherId), this.conversationSchool(teacherId), eq(schema.aiConversations.id, conversationId)))
      .limit(1)
    return rows[0] ?? null
  }

  public async getMessages(teacherId: number, conversationId: string, limit = 30) {
    const rows = await this.db
      .select({
        id: schema.aiMessages.id,
        role: schema.aiMessages.role,
        content: schema.aiMessages.content,
        createdAt: schema.aiMessages.createdAt,
      })
      .from(schema.aiMessages)
      .innerJoin(schema.aiConversations, eq(schema.aiMessages.conversationId, schema.aiConversations.id))
      .where(and(eq(schema.aiConversations.teacherId, teacherId), this.conversationSchool(teacherId), eq(schema.aiMessages.conversationId, conversationId)))
      .orderBy(desc(schema.aiMessages.id))
      .limit(limit)
    return rows.reverse()
  }

  public async addMessage(teacherId: number, conversationId: string, role: 'user' | 'assistant', content: string) {
    const conversation = await this.findConversation(teacherId, conversationId)
    if (!conversation) return null

    const now = new Date()
    const inserted = await this.db
      .insert(schema.aiMessages)
      .values({ conversationId, role, content, createdAt: now })
      .returning()
    await this.db
      .update(schema.aiConversations)
      .set({ updatedAt: now })
      .where(and(eq(schema.aiConversations.id, conversationId), eq(schema.aiConversations.teacherId, teacherId), this.conversationSchool(teacherId)))
    return inserted[0] ?? null
  }

  public async updateTitleIfNew(teacherId: number, conversationId: string, title: string) {
    await this.db
      .update(schema.aiConversations)
      .set({ title, updatedAt: new Date() })
      .where(
        and(
          eq(schema.aiConversations.id, conversationId),
          eq(schema.aiConversations.teacherId, teacherId),
          this.conversationSchool(teacherId),
          eq(schema.aiConversations.title, 'Perbualan baharu'),
        ),
      )
  }

  public async deleteConversation(teacherId: number, conversationId: string) {
    const deleted = await this.db
      .delete(schema.aiConversations)
      .where(and(eq(schema.aiConversations.id, conversationId), eq(schema.aiConversations.teacherId, teacherId), this.conversationSchool(teacherId)))
      .returning({ id: schema.aiConversations.id })
    return deleted.length > 0
  }

  public async createPendingAction(data: typeof schema.aiPendingActions.$inferInsert) {
    const conversation = await this.findConversation(data.teacherId, data.conversationId)
    if (!conversation || conversation.schoolId === null) return null
    const inserted = await this.db.insert(schema.aiPendingActions).values({ ...data, schoolId: conversation.schoolId }).returning()
    return inserted[0] ?? null
  }

  public async getPendingActions(teacherId: number, conversationId: string) {
    return this.db
      .select({
        id: schema.aiPendingActions.id,
        actionType: schema.aiPendingActions.actionType,
        preview: schema.aiPendingActions.preview,
        status: schema.aiPendingActions.status,
        expiresAt: schema.aiPendingActions.expiresAt,
      })
      .from(schema.aiPendingActions)
      .where(
        and(
          eq(schema.aiPendingActions.teacherId, teacherId),
          this.actionSchool(teacherId),
          eq(schema.aiPendingActions.conversationId, conversationId),
          eq(schema.aiPendingActions.status, 'pending'),
        ),
      )
      .orderBy(desc(schema.aiPendingActions.createdAt))
      .limit(5)
  }

  public async hasOpenPendingAction(teacherId: number, conversationId: string, now: Date) {
    const rows = await this.db
      .select({ id: schema.aiPendingActions.id })
      .from(schema.aiPendingActions)
      .where(
        and(
          eq(schema.aiPendingActions.teacherId, teacherId),
          this.actionSchool(teacherId),
          eq(schema.aiPendingActions.conversationId, conversationId),
          inArray(schema.aiPendingActions.status, ['pending', 'executing']),
          gt(schema.aiPendingActions.expiresAt, now),
        ),
      )
      .limit(1)
    return rows.length > 0
  }

  public async expirePendingActions(teacherId: number, now: Date) {
    await this.db
      .update(schema.aiPendingActions)
      .set({ status: 'expired', payload: '{}', preview: '{}', completedAt: now })
      .where(
        and(
          eq(schema.aiPendingActions.teacherId, teacherId),
          this.actionSchool(teacherId),
          inArray(schema.aiPendingActions.status, ['pending', 'executing']),
          lt(schema.aiPendingActions.expiresAt, now),
        ),
      )
  }

  public async claimPendingAction(teacherId: number, actionId: string, now: Date) {
    const claimed = await this.db
      .update(schema.aiPendingActions)
      .set({ status: 'executing' })
      .where(
        and(
          eq(schema.aiPendingActions.id, actionId),
          eq(schema.aiPendingActions.teacherId, teacherId),
          this.actionSchool(teacherId),
          eq(schema.aiPendingActions.status, 'pending'),
          gt(schema.aiPendingActions.expiresAt, now),
        ),
      )
      .returning()
    return claimed[0] ?? null
  }

  public async cancelPendingAction(teacherId: number, actionId: string, now: Date) {
    const cancelled = await this.db
      .update(schema.aiPendingActions)
      .set({ status: 'cancelled', payload: '{}', preview: '{}', completedAt: now })
      .where(
        and(
          eq(schema.aiPendingActions.id, actionId),
          eq(schema.aiPendingActions.teacherId, teacherId),
          this.actionSchool(teacherId),
          eq(schema.aiPendingActions.status, 'pending'),
          gt(schema.aiPendingActions.expiresAt, now),
        ),
      )
      .returning({ id: schema.aiPendingActions.id, conversationId: schema.aiPendingActions.conversationId })
    return cancelled[0] ?? null
  }

  public async completePendingAction(teacherId: number, actionId: string, now: Date) {
    const updated = await this.db
      .update(schema.aiPendingActions)
      .set({ status: 'confirmed', payload: '{}', preview: '{}', completedAt: now })
      .where(
        and(
          eq(schema.aiPendingActions.id, actionId),
          eq(schema.aiPendingActions.teacherId, teacherId),
          this.actionSchool(teacherId),
          eq(schema.aiPendingActions.status, 'executing'),
        ),
      )
      .returning({ id: schema.aiPendingActions.id })
    return updated.length > 0
  }

  public async failPendingAction(teacherId: number, actionId: string, now: Date) {
    await this.db
      .update(schema.aiPendingActions)
      .set({ status: 'failed', payload: '{}', preview: '{}', completedAt: now })
      .where(
        and(
          eq(schema.aiPendingActions.id, actionId),
          eq(schema.aiPendingActions.teacherId, teacherId),
          this.actionSchool(teacherId),
          eq(schema.aiPendingActions.status, 'executing'),
        ),
      )
  }

  private conversationSchool(teacherId: number) {
    return sql`${schema.aiConversations.schoolId} = (SELECT school_id FROM teacher_profiles WHERE user_id = ${teacherId} ORDER BY id LIMIT 1)`
  }

  private actionSchool(teacherId: number) {
    return sql`${schema.aiPendingActions.schoolId} = (SELECT school_id FROM teacher_profiles WHERE user_id = ${teacherId} ORDER BY id LIMIT 1)`
  }
}
