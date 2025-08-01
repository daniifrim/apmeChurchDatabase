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
  createdAt: timestamp("created_at").defaultNow(),
});

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
}));

export const usersRelations = relations(users, ({ many }) => ({
  createdChurches: many(churches),
  visits: many(visits),
  activities: many(activities),
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
