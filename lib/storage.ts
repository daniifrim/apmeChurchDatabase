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
  County,
  RccpRegion,
} from '../shared/schema';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
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
  
  // County operations
  getCounties(filters?: { regionId?: number }): Promise<County[]>;
  
  // Region operations
  getRccpRegions(): Promise<RccpRegion[]>;
  
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
        id: userData.id,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role,
        region: userData.region,
        updated_at: new Date().toISOString(),
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
    countyId?: number;
    regionId?: number;
    engagementLevel?: string;
  }): Promise<Church[]> {
    // Start with basic church query
    let query = supabase
      .from('churches')
      .select('*')
      .eq('is_active', true);
    
    // Apply filters
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,pastor.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
    }
    
    if (filters?.county) {
      query = query.eq('county', filters.county);
    }
    
    if (filters?.countyId) {
      query = query.eq('county_id', filters.countyId);
    }
    
    if (filters?.engagementLevel) {
      query = query.eq('engagement_level', filters.engagementLevel);
    }
    
    const { data: churches, error } = await query.order('updated_at', { ascending: false });
    
    if (error) throw error;
    if (!churches || churches.length === 0) return [];
    
    // Helper function to map database fields to frontend format
    const mapChurchFields = (church: any, county?: any) => ({
      ...church,
      isActive: church.is_active,
      memberCount: church.member_count,
      foundedYear: church.founded_year,
      engagementLevel: church.engagement_level,
      createdBy: church.created_by,
      createdAt: church.created_at,
      updatedAt: church.updated_at,
      countyId: church.county_id,
      counties: county
    });
    
    // Get all counties and regions for the churches
    const countyIds = [...new Set(churches.map(c => c.county_id).filter(Boolean))];
    
    if (countyIds.length > 0) {
      const { data: counties, error: countiesError } = await supabase
        .from('counties')
        .select(`
          id,
          name,
          abbreviation,
          rccp_region_id,
          rccp_regions!rccp_region_id (
            id,
            name
          )
        `)
        .in('id', countyIds);
      
      if (!countiesError && counties) {
        // Map counties to churches
        const countiesMap = new Map(counties.map(c => [c.id, c]));
        
        // Apply region filter if needed
        let filteredChurches = churches;
        if (filters?.regionId) {
          filteredChurches = churches.filter(church => {
            const county = countiesMap.get(church.county_id);
            return county?.rccp_region_id === filters.regionId;
          });
        }
        
        return filteredChurches.map(church => 
          mapChurchFields(church, church.county_id ? countiesMap.get(church.county_id) : undefined)
        ) as Church[];
      }
    }
    
    // Fallback: return churches without county data
    return churches.map(church => mapChurchFields(church)) as Church[];
  }

  async getChurchById(id: number): Promise<Church | undefined> {
    const { data: church, error } = await supabase
      .from('churches')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    
    if (!church) return undefined;
    
    // Get county and region data if county_id exists
    if (church.county_id) {
      const { data: county, error: countyError } = await supabase
        .from('counties')
        .select(`
          id,
          name,
          abbreviation,
          rccp_region_id,
          rccp_regions!rccp_region_id (
            id,
            name
          )
        `)
        .eq('id', church.county_id)
        .single();
      
      if (!countyError && county) {
        return {
          ...church,
          isActive: church.is_active,
          memberCount: church.member_count,
          foundedYear: church.founded_year,
          engagementLevel: church.engagement_level,
          createdBy: church.created_by,
          createdAt: church.created_at,
          updatedAt: church.updated_at,
          countyId: church.county_id,
          counties: county
        } as Church;
      }
    }
    
    return {
      ...church,
      isActive: church.is_active,
      memberCount: church.member_count,
      foundedYear: church.founded_year,
      engagementLevel: church.engagement_level,
      createdBy: church.created_by,
      createdAt: church.created_at,
      updatedAt: church.updated_at,
      countyId: church.county_id,
    } as Church;
  }

  async createChurch(church: InsertChurch): Promise<Church> {
    // Map camelCase to snake_case for database
    const dbChurch = {
      name: church.name,
      address: church.address,
      city: church.city,
      county: church.county,
      county_id: church.countyId,
      country: church.country,
      latitude: church.latitude,
      longitude: church.longitude,
      pastor: church.pastor,
      phone: church.phone,
      email: church.email,
      member_count: church.memberCount,
      founded_year: church.foundedYear,
      engagement_level: church.engagementLevel,
      notes: church.notes,
      is_active: church.isActive ?? true,
      created_by: church.createdBy,
    };

    const { data, error } = await supabase
      .from('churches')
      .insert(dbChurch)
      .select()
      .single();
    
    if (error) throw error;
    
    // Get the full church data with county/region info
    return this.getChurchById(data.id) || data as Church;
  }

  async updateChurch(id: number, church: Partial<InsertChurch>): Promise<Church> {
    const { data, error } = await supabase
      .from('churches')
      .update({
        ...church,
        updated_at: new Date().toISOString(),
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
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (error) throw error;
  }

  // Visit operations
  async getVisitsByChurch(churchId: number): Promise<Visit[]> {
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('church_id', churchId)
      .order('visit_date', { ascending: false });
    
    if (error) throw error;
    return data as Visit[];
  }

  async createVisit(visit: InsertVisit): Promise<Visit> {
    // Map camelCase to snake_case for database
    const dbVisit = {
      church_id: visit.churchId,
      visited_by: visit.visitedBy,
      visit_date: visit.visitDate,
      purpose: visit.purpose,
      notes: visit.notes,
      follow_up_required: visit.followUpRequired,
    };

    const { data, error } = await supabase
      .from('visits')
      .insert(dbVisit)
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
      .eq('church_id', churchId)
      .order('activity_date', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as Activity[];
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    // Map camelCase to snake_case for database
    const dbActivity = {
      church_id: activity.churchId,
      user_id: activity.userId,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      activity_date: activity.activityDate,
    };

    const { data, error } = await supabase
      .from('activities')
      .insert(dbActivity)
      .select()
      .single();
    
    if (error) throw error;
    return data as Activity;
  }

  // County operations
  async getCounties(filters?: { regionId?: number }): Promise<County[]> {
    let query = supabase
      .from('counties')
      .select('*');
    
    if (filters?.regionId) {
      query = query.eq('rccp_region_id', filters.regionId);
    }
    
    const { data, error } = await query.order('name', { ascending: true });
    
    if (error) throw error;
    return data as County[];
  }

  // Region operations
  async getRccpRegions(): Promise<RccpRegion[]> {
    const { data, error } = await supabase
      .from('rccp_regions')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data as RccpRegion[];
  }

  // Analytics
  async getAnalytics(): Promise<{
    totalChurches: number;
    activeChurches: number;
    pendingVisits: number;
    newThisMonth: number;
    engagementBreakdown: { level: string; count: number }[];
    regionalBreakdown: { region: string; count: number }[];
    countyBreakdown: { county: string; region: string; count: number }[];
  }> {
    // Get total churches
    const { count: totalChurches, error: totalError } = await supabase
      .from('churches')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    if (totalError) throw totalError;

    // Get active churches (not new)
    const { count: activeChurches, error: activeError } = await supabase
      .from('churches')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .neq('engagement_level', 'new');
    
    if (activeError) throw activeError;

    // Get pending visits
    const { count: pendingVisits, error: pendingError } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('follow_up_required', true);
    
    if (pendingError) throw pendingError;

    // Get new churches this month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const { count: newThisMonth, error: newError } = await supabase
      .from('churches')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('created_at', oneMonthAgo.toISOString());
    
    if (newError) throw newError;

    // Get engagement breakdown
    const { data: engagementData, error: engagementError } = await supabase
      .from('churches')
      .select('engagement_level')
      .eq('is_active', true);
    
    if (engagementError) throw engagementError;

    // Count engagement levels
    const engagementBreakdown = engagementData.reduce((acc: { level: string; count: number }[], church) => {
      const level = church.engagement_level || 'unknown';
      const existing = acc.find(item => item.level === level);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ level, count: 1 });
      }
      return acc;
    }, []);

    // Get regional breakdown
    const { data: regionalData, error: regionalError } = await supabase
      .from('churches')
      .select(`
        county_id,
        counties!county_id (
          name,
          rccp_regions!rccp_region_id (
            name
          )
        )
      `)
      .eq('is_active', true);
    
    if (regionalError) throw regionalError;

    // Process regional and county breakdowns
    const regionalBreakdown: { [key: string]: number } = {};
    const countyBreakdown: { [key: string]: { region: string; count: number } } = {};

    regionalData?.forEach((church: any) => {
      const regionName = church.counties?.rccp_regions?.name || 'Unknown';
      const countyName = church.counties?.name || 'Unknown';
      
      // Regional breakdown
      regionalBreakdown[regionName] = (regionalBreakdown[regionName] || 0) + 1;
      
      // County breakdown
      if (!countyBreakdown[countyName]) {
        countyBreakdown[countyName] = { region: regionName, count: 0 };
      }
      countyBreakdown[countyName].count++;
    });

    return {
      totalChurches: totalChurches || 0,
      activeChurches: activeChurches || 0,
      pendingVisits: pendingVisits || 0,
      newThisMonth: newThisMonth || 0,
      engagementBreakdown,
      regionalBreakdown: Object.entries(regionalBreakdown).map(([region, count]) => ({
        region,
        count
      })),
      countyBreakdown: Object.entries(countyBreakdown).map(([county, data]) => ({
        county,
        region: data.region,
        count: data.count
      }))
    };
  }
}

export const serverlessStorage = new ServerlessStorage();
