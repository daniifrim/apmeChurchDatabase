import { createClient } from '@supabase/supabase-js';
import type {
  User,
  UpsertUser,
  Church,
  InsertChurch,
  Visit,
  InsertVisit,
  Activity,
  InsertActivity,
} from '@shared/schema';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Interface for storage operations (compatible with existing interface)
export interface IServerlessStorage {
  // Test operations
  testConnection(): Promise<any>;
  
  // User operations
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

export class ServerlessStorage implements IServerlessStorage {
  // Test operations
  async testConnection(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .limit(1);
        
      if (error) throw error;
      return { method: 'supabase', result: data, status: 'connected' };
    } catch (error) {
      throw new Error(`Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    
    return data as User;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        ...userData,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as User;
  }

  // Church operations
  async getChurches(filters?: {
    search?: string;
    county?: string;
    engagementLevel?: string;
  }): Promise<Church[]> {
    let query = supabase
      .from('churches')
      .select('*')
      .eq('isActive', true);
    
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,pastor.ilike.%${filters.search}%`);
    }
    
    if (filters?.county) {
      query = query.eq('county', filters.county);
    }
    
    if (filters?.engagementLevel) {
      query = query.eq('engagementLevel', filters.engagementLevel);
    }
    
    const { data, error } = await query.order('updatedAt', { ascending: false });
    
    if (error) throw error;
    return data as Church[];
  }

  async getChurchById(id: number): Promise<Church | undefined> {
    const { data, error } = await supabase
      .from('churches')
      .select('*')
      .eq('id', id)
      .eq('isActive', true)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    
    return data as Church;
  }

  async createChurch(church: InsertChurch): Promise<Church> {
    const { data, error } = await supabase
      .from('churches')
      .insert(church)
      .select()
      .single();
    
    if (error) throw error;
    return data as Church;
  }

  async updateChurch(id: number, church: Partial<InsertChurch>): Promise<Church> {
    const { data, error } = await supabase
      .from('churches')
      .update({
        ...church,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Church;
  }

  async deleteChurch(id: number): Promise<void> {
    const { error } = await supabase
      .from('churches')
      .update({
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (error) throw error;
  }

  // Visit operations
  async getVisitsByChurch(churchId: number): Promise<Visit[]> {
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('churchId', churchId)
      .order('visitDate', { ascending: false });
    
    if (error) throw error;
    return data as Visit[];
  }

  async createVisit(visit: InsertVisit): Promise<Visit> {
    const { data, error } = await supabase
      .from('visits')
      .insert(visit)
      .select()
      .single();
    
    if (error) throw error;
    return data as Visit;
  }

  // Activity operations
  async getActivitiesByChurch(churchId: number, limit = 10): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('churchId', churchId)
      .order('activityDate', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as Activity[];
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const { data, error } = await supabase
      .from('activities')
      .insert(activity)
      .select()
      .single();
    
    if (error) throw error;
    return data as Activity;
  }

  // Analytics
  async getAnalytics(): Promise<{
    totalChurches: number;
    activeChurches: number;
    pendingVisits: number;
    newThisMonth: number;
    engagementBreakdown: { level: string; count: number }[];
  }> {
    // Get total churches
    const { count: totalChurches, error: totalError } = await supabase
      .from('churches')
      .select('*', { count: 'exact', head: true })
      .eq('isActive', true);
    
    if (totalError) throw totalError;

    // Get active churches (not new)
    const { count: activeChurches, error: activeError } = await supabase
      .from('churches')
      .select('*', { count: 'exact', head: true })
      .eq('isActive', true)
      .neq('engagementLevel', 'new');
    
    if (activeError) throw activeError;

    // Get pending visits
    const { count: pendingVisits, error: pendingError } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('followUpRequired', true);
    
    if (pendingError) throw pendingError;

    // Get new churches this month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const { count: newThisMonth, error: newError } = await supabase
      .from('churches')
      .select('*', { count: 'exact', head: true })
      .eq('isActive', true)
      .gte('createdAt', oneMonthAgo.toISOString());
    
    if (newError) throw newError;

    // Get engagement breakdown
    const { data: engagementData, error: engagementError } = await supabase
      .from('churches')
      .select('engagementLevel')
      .eq('isActive', true);
    
    if (engagementError) throw engagementError;

    // Count engagement levels
    const engagementBreakdown = engagementData.reduce((acc: { level: string; count: number }[], church) => {
      const level = church.engagementLevel || 'unknown';
      const existing = acc.find(item => item.level === level);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ level, count: 1 });
      }
      return acc;
    }, []);

    return {
      totalChurches: totalChurches || 0,
      activeChurches: activeChurches || 0,
      pendingVisits: pendingVisits || 0,
      newThisMonth: newThisMonth || 0,
      engagementBreakdown,
    };
  }
}

export const serverlessStorage = new ServerlessStorage();