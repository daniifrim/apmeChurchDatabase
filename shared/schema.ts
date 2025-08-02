import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["administrator", "mobilizer", "missionary"] }).notNull().default("missionary"),
  region: varchar("region"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const churches = pgTable("churches", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  county: varchar("county", { length: 100 }).notNull(),
  countyId: integer("county_id").references(() => counties.id).notNull(),
  country: varchar("country", { length: 100 }).notNull().default("Romania"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  pastor: varchar("pastor", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  memberCount: integer("member_count"),
  foundedYear: integer("founded_year"),
  engagementLevel: varchar("engagement_level", { enum: ["high", "medium", "low", "new"] }).notNull().default("new"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").references(() => churches.id).notNull(),
  visitedBy: varchar("visited_by").references(() => users.id).notNull(),
  visitDate: timestamp("visit_date").notNull(),
  purpose: varchar("purpose", { length: 255 }),
  notes: text("notes"),
  followUpRequired: boolean("follow_up_required").default(false),
  attendeesCount: integer("attendees_count"),
  isRated: boolean("is_rated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_visits_church").on(table.churchId),
  index("idx_visits_user").on(table.visitedBy),
  index("idx_visits_date").on(table.visitDate),
]);

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").references(() => churches.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type", { enum: ["visit", "call", "training", "event", "note"] }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  activityDate: timestamp("activity_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rccpRegions = pgTable("rccp_regions", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const counties = pgTable("counties", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  abbreviation: varchar("abbreviation", { length: 2 }).notNull().unique(),
  rccpRegionId: integer("rccp_region_id").references(() => rccpRegions.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Visit ratings table - stores individual visit ratings
export const visitRatings = pgTable("visit_ratings", {
  id: serial("id").primaryKey(),
  visitId: integer("visit_id").references(() => visits.id, { onDelete: "cascade" }).notNull().unique(),
  missionaryId: varchar("missionary_id").references(() => users.id),
  
  // Core ratings (1-5 scale)
  missionOpennessRating: integer("mission_openness_rating").notNull(),
  hospitalityRating: integer("hospitality_rating").notNull(),
  
  // Missionary support
  missionarySupportCount: integer("missionary_support_count").default(0).notNull(),
  
  // Financial data
  offeringsAmount: decimal("offerings_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  churchMembers: integer("church_members").notNull(),
  attendeesCount: integer("attendees_count").notNull(),
  
  // Calculated fields
  financialScore: decimal("financial_score", { precision: 3, scale: 2 }).notNull(),
  missionaryBonus: decimal("missionary_bonus", { precision: 3, scale: 2 }).notNull(),
  calculatedStarRating: integer("calculated_star_rating").notNull(),
  
  // Additional context
  visitDurationMinutes: integer("visit_duration_minutes"),
  notes: text("notes"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_ratings_visit").on(table.visitId),
  index("idx_ratings_missionary").on(table.missionaryId),
]);

// Church star ratings - aggregated ratings per church
export const churchStarRatings = pgTable("church_star_ratings", {
  id: serial("id").primaryKey(),
  churchId: integer("church_id").references(() => churches.id, { onDelete: "cascade" }).notNull().unique(),
  
  // Overall metrics
  averageStars: decimal("average_stars", { precision: 2, scale: 1 }),
  totalVisits: integer("total_visits").default(0).notNull(),
  visitsLast30Days: integer("visits_last_30_days").default(0).notNull(),
  visitsLast90Days: integer("visits_last_90_days").default(0).notNull(),
  
  // Rating breakdowns
  avgMissionOpenness: decimal("avg_mission_openness", { precision: 3, scale: 2 }),
  avgHospitality: decimal("avg_hospitality", { precision: 3, scale: 2 }),
  avgFinancialGenerosity: decimal("avg_financial_generosity", { precision: 3, scale: 2 }),
  avgMissionarySupport: decimal("avg_missionary_support", { precision: 3, scale: 2 }),
  
  // Financial summary
  totalOfferingsCollected: decimal("total_offerings_collected", { precision: 12, scale: 2 }).default("0.00").notNull(),
  avgOfferingsPerVisit: decimal("avg_offerings_per_visit", { precision: 10, scale: 2 }).default("0.00").notNull(),
  
  // Metadata
  lastVisitDate: timestamp("last_visit_date"),
  lastCalculated: timestamp("last_calculated").defaultNow(),
}, (table) => [
  index("idx_church_stars").on(table.churchId),
  index("idx_average_stars").on(table.averageStars),
  index("idx_last_visit").on(table.lastVisitDate),
]);

// Relations
export const churchesRelations = relations(churches, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [churches.createdBy],
    references: [users.id],
  }),
  county: one(counties, {
    fields: [churches.countyId],
    references: [counties.id],
  }),
  visits: many(visits),
  activities: many(activities),
  starRating: one(churchStarRatings, {
    fields: [churches.id],
    references: [churchStarRatings.churchId],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  createdChurches: many(churches),
  visits: many(visits),
  activities: many(activities),
  ratings: many(visitRatings),
}));

export const visitsRelations = relations(visits, ({ one }) => ({
  church: one(churches, {
    fields: [visits.churchId],
    references: [churches.id],
  }),
  visitedBy: one(users, {
    fields: [visits.visitedBy],
    references: [users.id],
  }),
  rating: one(visitRatings, {
    fields: [visits.id],
    references: [visitRatings.visitId],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  church: one(churches, {
    fields: [activities.churchId],
    references: [churches.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const rccpRegionsRelations = relations(rccpRegions, ({ many }) => ({
  counties: many(counties),
}));

export const countiesRelations = relations(counties, ({ one, many }) => ({
  rccpRegion: one(rccpRegions, {
    fields: [counties.rccpRegionId],
    references: [rccpRegions.id],
  }),
  churches: many(churches),
}));

export const visitRatingsRelations = relations(visitRatings, ({ one }) => ({
  visit: one(visits, {
    fields: [visitRatings.visitId],
    references: [visits.id],
  }),
  missionary: one(users, {
    fields: [visitRatings.missionaryId],
    references: [users.id],
  }),
}));

export const churchStarRatingsRelations = relations(churchStarRatings, ({ one }) => ({
  church: one(churches, {
    fields: [churchStarRatings.churchId],
    references: [churches.id],
  }),
}));

// Schemas
export const insertChurchSchema = createInsertSchema(churches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  countyId: z.number().positive("County ID is required"),
});

export const insertVisitSchema = z.object({
  churchId: z.number(),
  visitedBy: z.string(),
  visitDate: z.union([z.date(), z.string()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  followUpRequired: z.boolean().optional(),
  attendeesCount: z.number().positive().optional(),
  isRated: z.boolean().optional(),
});

export const insertVisitRatingSchema = z.object({
  visitId: z.number(),
  missionaryId: z.string(),
  missionOpennessRating: z.number().min(1).max(5),
  hospitalityRating: z.number().min(1).max(5),
  missionarySupportCount: z.number().min(0).default(0),
  offeringsAmount: z.number().min(0).default(0),
  churchMembers: z.number().positive(),
  attendeesCount: z.number().positive(),
  visitDurationMinutes: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const createRatingRequestSchema = z.object({
  missionOpennessRating: z.number().min(1).max(5),
  hospitalityRating: z.number().min(1).max(5),
  missionarySupportCount: z.number().min(0).default(0),
  offeringsAmount: z.number().min(0).default(0),
  churchMembers: z.number().positive(),
  attendeesCount: z.number().positive(),
  visitDurationMinutes: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const insertActivitySchema = z.object({
  churchId: z.number(),
  userId: z.string(),
  type: z.enum(["visit", "call", "training", "event", "note"]),
  title: z.string(),
  description: z.string().optional(),
  activityDate: z.union([z.date(), z.string()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

export const insertRccpRegionSchema = createInsertSchema(rccpRegions).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCountySchema = createInsertSchema(counties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Church = typeof churches.$inferSelect;
export type InsertChurch = z.infer<typeof insertChurchSchema>;
export type Visit = typeof visits.$inferSelect;
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type RccpRegion = typeof rccpRegions.$inferSelect;
export type InsertRccpRegion = z.infer<typeof insertRccpRegionSchema>;
export type County = typeof counties.$inferSelect;
export type InsertCounty = z.infer<typeof insertCountySchema>;

// Rating types
export type VisitRating = typeof visitRatings.$inferSelect;
export type InsertVisitRating = z.infer<typeof insertVisitRatingSchema>;
export type CreateRatingRequest = z.infer<typeof createRatingRequestSchema>;
export type ChurchStarRating = typeof churchStarRatings.$inferSelect;

// Calculated rating response type
export type CalculatedRating = {
  starRating: number;
  financialScore: number;
  missionaryBonus: number;
  breakdown: {
    missionOpenness: number;
    hospitality: number;
    financial: number;
    missionaryBonus: number;
  };
};

// Church rating summary type
export type ChurchRatingSummary = {
  averageStars: number;
  totalVisits: number;
  lastVisitDate?: Date;
  ratingBreakdown: {
    missionOpenness: number;
    hospitality: number;
    financialGenerosity: number;
    missionarySupport: number;
  };
  totalOfferings: number;
  averageOfferingsPerVisit: number;
};
