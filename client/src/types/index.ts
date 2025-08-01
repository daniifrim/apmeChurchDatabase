export interface RccpRegion {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface County {
  id: number;
  name: string;
  abbreviation: string;
  rccpRegionId: number;
  createdAt: string;
  updatedAt: string;
  rccp_regions?: RccpRegion;
}

export interface Church {
  id: number;
  name: string;
  address: string;
  city: string;
  county: string;
  countyId: number;
  country: string;
  latitude: string;
  longitude: string;
  pastor: string | null;
  phone: string | null;
  email: string | null;
  memberCount: number | null;
  foundedYear: number | null;
  engagementLevel: "high" | "medium" | "low" | "new";
  notes: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  counties?: County;
}

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: "administrator" | "mobilizer" | "missionary";
  region: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Visit {
  id: number;
  churchId: number;
  visitedBy: string;
  visitDate: string;
  purpose: string | null;
  notes: string | null;
  followUpRequired: boolean | null;
  createdAt: string;
}

export interface Activity {
  id: number;
  churchId: number;
  userId: string;
  type: "visit" | "call" | "training" | "event" | "note";
  title: string;
  description: string | null;
  activityDate: string;
  createdAt: string;
}

export interface Analytics {
  totalChurches: number;
  activeChurches: number;
  pendingVisits: number;
  newThisMonth: number;
  engagementBreakdown: Array<{
    level: string;
    count: number;
  }>;
  regionalBreakdown: Array<{
    region: string;
    count: number;
  }>;
  countyBreakdown: Array<{
    county: string;
    region: string;
    count: number;
  }>;
}
