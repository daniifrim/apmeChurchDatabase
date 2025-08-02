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
  VisitRating,
  InsertVisitRating,
  ChurchStarRating,
  CalculatedRating,
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
  getAllVisitsWithChurches(): Promise<any[]>;
  getVisitById(id: number): Promise<Visit | undefined>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  updateVisit(id: number, visit: Partial<InsertVisit>): Promise<Visit>;
  deleteVisit(id: number): Promise<void>;
  
  // Rating operations
  getVisitRating(visitId: number): Promise<VisitRating | undefined>;
  createVisitRating(rating: InsertVisitRating, calculated: CalculatedRating): Promise<VisitRating>;
  getChurchStarRating(churchId: number): Promise<ChurchStarRating | undefined>;
  getChurchRatingHistory(churchId: number, limit: number, offset: number): Promise<any[]>;
  getTopRatedChurches(limit: number, offset: number): Promise<ChurchStarRating[]>;
  getRecentlyActiveChurches(limit: number): Promise<ChurchStarRating[]>;
  getRatingStatistics(): Promise<{
    totalRatedChurches: number;
    averageRating: number;
    totalVisits: number;
    totalOfferings: number;
    ratingDistribution: { stars: number; count: number }[];
  }>;
  recalculateChurchRating(churchId: number): Promise<void>;
  
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
    // Helper function to normalize text for diacritic-insensitive search
    const normalizeForSearch = (text: string): string => {
      return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[ăĂ]/g, 'a')
        .replace(/[âÂ]/g, 'a')
        .replace(/[îÎ]/g, 'i')
        .replace(/[șȘ]/g, 's')
        .replace(/[țȚ]/g, 't')
        .toLowerCase();
    };

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

    // Start with basic church query
    let query = supabase
      .from('churches')
      .select('*')
      .eq('is_active', true);
    
    // If no search, apply other filters normally
    if (!filters?.search) {
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
      
      // Continue with county/region processing
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
          const countiesMap = new Map(counties.map(c => [c.id, c]));
          
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
      
      return churches.map(church => mapChurchFields(church)) as Church[];
    }
    
    // For search queries, fetch all churches and filter client-side for diacritic-insensitive search
    const searchTerm = normalizeForSearch(filters.search);
    
    const { data: allChurches, error } = await query.order('updated_at', { ascending: false });
    
    if (error) throw error;
    if (!allChurches || allChurches.length === 0) return [];
    
    // Filter churches client-side for diacritic-insensitive search
    let filteredChurches = allChurches.filter(church => {
      const searchableFields = [
        church.name,
        church.address,
        church.pastor,
        church.city,
        church.county
      ].filter(Boolean);
      
      return searchableFields.some(field => 
        normalizeForSearch(String(field)).includes(searchTerm)
      );
    });
    
    // Apply other filters
    if (filters?.county) {
      filteredChurches = filteredChurches.filter(church => 
        normalizeForSearch(church.county || '').includes(normalizeForSearch(filters.county!))
      );
    }
    
    if (filters?.countyId) {
      filteredChurches = filteredChurches.filter(church => church.county_id === filters.countyId);
    }
    
    if (filters?.engagementLevel) {
      filteredChurches = filteredChurches.filter(church => church.engagement_level === filters.engagementLevel);
    }
    
    if (filters?.regionId) {
      // For region filtering with search, we need to get county data
      const countyIds = [...new Set(filteredChurches.map(c => c.county_id).filter(Boolean))];
      
      if (countyIds.length > 0) {
        const { data: counties, error: countiesError } = await supabase
          .from('counties')
          .select(`
            id,
            rccp_region_id
          `)
          .in('id', countyIds);
        
        if (!countiesError && counties) {
          const countiesMap = new Map(counties.map(c => [c.id, c]));
          filteredChurches = filteredChurches.filter(church => {
            const county = countiesMap.get(church.county_id);
            return county?.rccp_region_id === filters.regionId;
          });
        }
      }
    }
    
    // Continue with county/region processing for filtered churches
    const countyIds = [...new Set(filteredChurches.map(c => c.county_id).filter(Boolean))];
    
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
        const countiesMap = new Map(counties.map(c => [c.id, c]));
        
        return filteredChurches.map(church => 
          mapChurchFields(church, church.county_id ? countiesMap.get(church.county_id) : undefined)
        ) as Church[];
      }
    }
    
    return filteredChurches.map(church => mapChurchFields(church)) as Church[];
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

  async getAllVisitsWithChurches(): Promise<any[]> {
    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        churches (
          id,
          name,
          address,
          city,
          county_id
        )
      `)
      .order('visit_date', { ascending: false });
    
    if (error) throw error;
    
    // Transform the data to flatten church information and normalize field names
    return data.map((visit: any) => ({
      ...visit,
      visitDate: visit.visit_date,
      attendeesCount: visit.attendees_count,
      followUpRequired: visit.follow_up_required,
      isRated: visit.is_rated,
      createdAt: visit.created_at,
      updatedAt: visit.updated_at,
      visitedBy: visit.visited_by,
      churchId: visit.church_id,
      churchName: visit.churches?.name,
      churchAddress: visit.churches?.address,
      churchCity: visit.churches?.city,
      churchCountyId: visit.churches?.county_id,
    }));
  }

  async getVisitById(id: number): Promise<Visit | undefined> {
    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        churches (
          id,
          name,
          address,
          city,
          county_id
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    
    // Transform the data to include church information and normalize field names
    const visit = {
      ...data,
      visitDate: data.visit_date,
      attendeesCount: data.attendees_count,
      followUpRequired: data.follow_up_required,
      isRated: data.is_rated,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      visitedBy: data.visited_by,
      churchId: data.church_id,
      churchName: data.churches?.name,
      churchAddress: data.churches?.address,
      churchCity: data.churches?.city,
      churchCountyId: data.churches?.county_id,
    };
    
    return visit as any; // Return with enhanced church data
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
      attendees_count: visit.attendeesCount,
    };

    const { data, error } = await supabase
      .from('visits')
      .insert(dbVisit)
      .select()
      .single();
    
    if (error) throw error;
    return data as Visit;
  }

  async updateVisit(id: number, visit: Partial<InsertVisit>): Promise<Visit> {
    // Map camelCase to snake_case for database
    const dbVisit: any = {
      updated_at: new Date().toISOString(),
    };

    if (visit.churchId !== undefined) dbVisit.church_id = visit.churchId;
    if (visit.visitedBy !== undefined) dbVisit.visited_by = visit.visitedBy;
    if (visit.visitDate !== undefined) dbVisit.visit_date = visit.visitDate;
    if (visit.purpose !== undefined) dbVisit.purpose = visit.purpose;
    if (visit.notes !== undefined) dbVisit.notes = visit.notes;
    if (visit.followUpRequired !== undefined) dbVisit.follow_up_required = visit.followUpRequired;
    if (visit.attendeesCount !== undefined) dbVisit.attendees_count = visit.attendeesCount;

    const { data, error } = await supabase
      .from('visits')
      .update(dbVisit)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Visit;
  }

  async deleteVisit(id: number): Promise<void> {
    const { error } = await supabase
      .from('visits')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
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

  // Rating operations
  async getVisitRating(visitId: number): Promise<VisitRating | undefined> {
    const { data, error } = await supabase
      .from('visit_ratings')
      .select('*')
      .eq('visit_id', visitId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    
    return data as VisitRating;
  }

  async createVisitRating(rating: InsertVisitRating, calculated: CalculatedRating): Promise<VisitRating> {
    // Map camelCase to snake_case for database
    const dbRating = {
      visit_id: rating.visitId,
      missionary_id: rating.missionaryId,
      mission_openness_rating: rating.missionOpennessRating,
      hospitality_rating: rating.hospitalityRating,
      missionary_support_count: rating.missionarySupportCount,
      offerings_amount: rating.offeringsAmount,
      church_members: rating.churchMembers,
      attendees_count: rating.attendeesCount,
      financial_score: calculated.financialScore,
      missionary_bonus: calculated.missionaryBonus,
      calculated_star_rating: calculated.starRating,
      visit_duration_minutes: rating.visitDurationMinutes,
      notes: rating.notes,
    };

    const { data, error } = await supabase
      .from('visit_ratings')
      .insert(dbRating)
      .select()
      .single();
    
    if (error) throw error;
    return data as VisitRating;
  }

  async getChurchStarRating(churchId: number): Promise<ChurchStarRating | undefined> {
    const { data, error } = await supabase
      .from('church_star_ratings')
      .select('*')
      .eq('church_id', churchId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    
    return data as ChurchStarRating;
  }

  async getTopRatedChurches(limit: number, offset: number): Promise<ChurchStarRating[]> {
    const { data, error } = await supabase
      .from('church_star_ratings')
      .select(`
        *,
        churches!church_id (
          id,
          name,
          city,
          county
        )
      `)
      .not('average_stars', 'is', null)
      .order('average_stars', { ascending: false })
      .order('total_visits', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    return data as ChurchStarRating[];
  }

  async getRecentlyActiveChurches(limit: number): Promise<ChurchStarRating[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('church_star_ratings')
      .select(`
        *,
        churches!church_id (
          id,
          name,
          city,
          county
        )
      `)
      .not('last_visit_date', 'is', null)
      .gte('last_visit_date', thirtyDaysAgo.toISOString())
      .order('last_visit_date', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as ChurchStarRating[];
  }

  async getRatingStatistics(): Promise<{
    totalRatedChurches: number;
    averageRating: number;
    totalVisits: number;
    totalOfferings: number;
    ratingDistribution: { stars: number; count: number }[];
  }> {
    // Get basic statistics
    const { data: stats, error: statsError } = await supabase
      .from('church_star_ratings')
      .select('average_stars, total_visits, total_offerings_collected')
      .not('average_stars', 'is', null);
    
    if (statsError) throw statsError;

    if (!stats || stats.length === 0) {
      return {
        totalRatedChurches: 0,
        averageRating: 0,
        totalVisits: 0,
        totalOfferings: 0,
        ratingDistribution: []
      };
    }

    // Calculate aggregates
    const totalRatedChurches = stats.length;
    const averageRating = stats.reduce((sum, s) => sum + Number(s.average_stars), 0) / totalRatedChurches;
    const totalVisits = stats.reduce((sum, s) => sum + Number(s.total_visits), 0);
    const totalOfferings = stats.reduce((sum, s) => sum + Number(s.total_offerings_collected), 0);

    // Calculate rating distribution
    const distribution: { [key: number]: number } = {};
    stats.forEach(s => {
      const rounded = Math.round(Number(s.average_stars));
      distribution[rounded] = (distribution[rounded] || 0) + 1;
    });

    const ratingDistribution = Object.entries(distribution)
      .map(([stars, count]) => ({ stars: Number(stars), count }))
      .sort((a, b) => a.stars - b.stars);

    return {
      totalRatedChurches,
      averageRating: Math.round(averageRating * 10) / 10,
      totalVisits,
      totalOfferings,
      ratingDistribution
    };
  }

  async getChurchRatingHistory(churchId: number, limit: number, offset: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('visit_ratings')
      .select(`
        id,
        visit_id,
        missionary_id,
        mission_openness_rating,
        hospitality_rating,
        missionary_support_count,
        offerings_amount,
        church_members,
        financial_score,
        missionary_bonus,
        calculated_star_rating,
        visit_duration_minutes,
        notes,
        created_at,
        visits!visit_id (
          id,
          visit_date
        ),
        users!missionary_id (
          first_name,
          last_name,
          email
        )
      `)
      .eq('visits.church_id', churchId)
      .order('visits.visit_date', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;

    // Transform the data to match the expected format
    return (data || []).map(rating => ({
      id: rating.id,
      visitId: rating.visit_id,
      visitDate: rating.visits?.visit_date,
      missionOpennessRating: rating.mission_openness_rating,
      hospitalityRating: rating.hospitality_rating,
      missionarySupportCount: rating.missionary_support_count,
      offeringsAmount: Number(rating.offerings_amount),
      churchMembers: rating.church_members,
      calculatedStarRating: rating.calculated_star_rating,
      visitDurationMinutes: rating.visit_duration_minutes,
      notes: rating.notes,
      createdAt: rating.created_at,
      missionaryName: rating.users?.first_name && rating.users?.last_name 
        ? `${rating.users.first_name} ${rating.users.last_name}`
        : 'Unknown Missionary',
      missionaryEmail: rating.users?.email || '',
      breakdown: {
        missionOpenness: rating.mission_openness_rating,
        hospitality: rating.hospitality_rating,
        financial: Number(rating.financial_score),
        missionarySupport: Number(rating.missionary_bonus)
      }
    }));
  }

  async recalculateChurchRating(churchId: number): Promise<void> {
    const { error } = await supabase.rpc('calculate_church_star_rating', {
      church_id_param: churchId
    });
    
    if (error) throw error;
  }
}

export const serverlessStorage = new ServerlessStorage();
