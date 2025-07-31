import {
  users,
  churches,
  visits,
  activities,
  type User,
  type UpsertUser,
  type Church,
  type InsertChurch,
  type Visit,
  type InsertVisit,
  type Activity,
  type InsertActivity,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Church operations
  getChurches(filters?: {
    search?: string;
    county?: string;
    engagementLevel?: string;
  }): Promise<Church[]>;
  getChurchById(id: number): Promise<Church | undefined>;
  createChurch(church: InsertChurch): Promise<Church>;
  updateChurch(id: number, church: Partial<InsertChurch>): Promise<Church>;
  deleteChurch(id: number): Promise<void>;
  
  // Visit operations
  getVisitsByChurch(churchId: number): Promise<Visit[]>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  
  // Activity operations
  getActivitiesByChurch(churchId: number, limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Analytics
  getAnalytics(): Promise<{
    totalChurches: number;
    activeChurches: number;
    pendingVisits: number;
    newThisMonth: number;
    engagementBreakdown: { level: string; count: number }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Church operations
  async getChurches(filters?: {
    search?: string;
    county?: string;
    engagementLevel?: string;
  }): Promise<Church[]> {
    let query = db.select().from(churches).where(eq(churches.isActive, true));
    
    const conditions = [eq(churches.isActive, true)];
    
    if (filters?.search) {
      conditions.push(
        sql`${churches.name} ILIKE ${`%${filters.search}%`} OR ${churches.address} ILIKE ${`%${filters.search}%`} OR ${churches.pastor} ILIKE ${`%${filters.search}%`}`
      );
    }
    
    if (filters?.county) {
      conditions.push(eq(churches.county, filters.county));
    }
    
    if (filters?.engagementLevel) {
      conditions.push(sql`${churches.engagementLevel} = ${filters.engagementLevel}`);
    }
    
    return db
      .select()
      .from(churches)
      .where(and(...conditions))
      .orderBy(desc(churches.updatedAt));
  }

  async getChurchById(id: number): Promise<Church | undefined> {
    const [church] = await db
      .select()
      .from(churches)
      .where(and(eq(churches.id, id), eq(churches.isActive, true)));
    return church;
  }

  async createChurch(church: InsertChurch): Promise<Church> {
    const [newChurch] = await db
      .insert(churches)
      .values(church)
      .returning();
    return newChurch;
  }

  async updateChurch(id: number, church: Partial<InsertChurch>): Promise<Church> {
    const [updatedChurch] = await db
      .update(churches)
      .set({ ...church, updatedAt: new Date() })
      .where(eq(churches.id, id))
      .returning();
    return updatedChurch;
  }

  async deleteChurch(id: number): Promise<void> {
    await db
      .update(churches)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(churches.id, id));
  }

  // Visit operations
  async getVisitsByChurch(churchId: number): Promise<Visit[]> {
    return db
      .select()
      .from(visits)
      .where(eq(visits.churchId, churchId))
      .orderBy(desc(visits.visitDate));
  }

  async createVisit(visit: InsertVisit): Promise<Visit> {
    const [newVisit] = await db
      .insert(visits)
      .values(visit)
      .returning();
    return newVisit;
  }

  // Activity operations
  async getActivitiesByChurch(churchId: number, limit = 10): Promise<Activity[]> {
    return db
      .select()
      .from(activities)
      .where(eq(activities.churchId, churchId))
      .orderBy(desc(activities.activityDate))
      .limit(limit);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db
      .insert(activities)
      .values(activity)
      .returning();
    return newActivity;
  }

  // Analytics
  async getAnalytics(): Promise<{
    totalChurches: number;
    activeChurches: number;
    pendingVisits: number;
    newThisMonth: number;
    engagementBreakdown: { level: string; count: number }[];
  }> {
    const totalChurches = await db
      .select({ count: sql<number>`count(*)` })
      .from(churches)
      .where(eq(churches.isActive, true));

    const activeChurches = await db
      .select({ count: sql<number>`count(*)` })
      .from(churches)
      .where(and(eq(churches.isActive, true), sql`${churches.engagementLevel} != 'new'`));

    const pendingVisits = await db
      .select({ count: sql<number>`count(*)` })
      .from(visits)
      .where(eq(visits.followUpRequired, true));

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const newThisMonth = await db
      .select({ count: sql<number>`count(*)` })
      .from(churches)
      .where(and(eq(churches.isActive, true), sql`${churches.createdAt} >= ${oneMonthAgo}`));

    const engagementBreakdown = await db
      .select({
        level: churches.engagementLevel,
        count: sql<number>`count(*)`
      })
      .from(churches)
      .where(eq(churches.isActive, true))
      .groupBy(churches.engagementLevel);

    return {
      totalChurches: totalChurches[0]?.count || 0,
      activeChurches: activeChurches[0]?.count || 0,
      pendingVisits: pendingVisits[0]?.count || 0,
      newThisMonth: newThisMonth[0]?.count || 0,
      engagementBreakdown: engagementBreakdown.map(item => ({
        level: item.level || 'unknown',
        count: item.count
      })),
    };
  }
}

export const storage = new DatabaseStorage();
