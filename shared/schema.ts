import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  real,
  doublePrecision,
  boolean,
  uuid,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  locationSharingEnabled: boolean("location_sharing_enabled").default(true),
  locationHistoryEnabled: boolean("location_history_enabled").default(true),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Family connections table
export const familyConnections = pgTable("family_connections", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  familyMemberId: serial("family_member_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("pending"), // pending, accepted, blocked
  createdAt: timestamp("created_at").defaultNow(),
});

// Locations table for tracking user locations
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  accuracy: doublePrecision("accuracy"),
  address: text("address"),
  type: varchar("type").notNull().default("manual"), // manual, automatic_hourly
  timestamp: timestamp("timestamp").defaultNow(),
});

// Places table for saved/favorite places
export const places = pgTable("places", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  address: text("address"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  category: varchar("category"), // home, work, school, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Invitation codes table for family invitations
export const invitationCodes = pgTable("invitation_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 6 }).unique().notNull(), // 6-character code
  userId: serial("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(), // Codes expire after 24 hours
  usedAt: timestamp("used_at"),
  usedById: integer("used_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  locations: many(locations),
  places: many(places),
  familyConnections: many(familyConnections, { relationName: "userConnections" }),
  familyMemberConnections: many(familyConnections, { relationName: "memberConnections" }),
  invitationCodes: many(invitationCodes),
}));

export const familyConnectionsRelations = relations(familyConnections, ({ one }) => ({
  user: one(users, {
    fields: [familyConnections.userId],
    references: [users.id],
    relationName: "userConnections",
  }),
  familyMember: one(users, {
    fields: [familyConnections.familyMemberId],
    references: [users.id],
    relationName: "memberConnections",
  }),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  user: one(users, {
    fields: [locations.userId],
    references: [users.id],
  }),
}));

export const placesRelations = relations(places, ({ one }) => ({
  user: one(users, {
    fields: [places.userId],
    references: [users.id],
  }),
}));

export const invitationCodesRelations = relations(invitationCodes, ({ one }) => ({
  user: one(users, {
    fields: [invitationCodes.userId],
    references: [users.id],
    relationName: "invitationCreator",
  }),
  usedBy: one(users, {
    fields: [invitationCodes.usedById],
    references: [users.id],
    relationName: "invitationUser",
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  timestamp: true,
});

export const insertPlaceSchema = createInsertSchema(places).omit({
  id: true,
  createdAt: true,
});

export const insertFamilyConnectionSchema = createInsertSchema(familyConnections).omit({
  id: true,
  createdAt: true,
});

export const insertInvitationCodeSchema = createInsertSchema(invitationCodes).omit({
  id: true,
  createdAt: true,
  usedAt: true,
  usedById: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Place = typeof places.$inferSelect;
export type InsertPlace = z.infer<typeof insertPlaceSchema>;
export type FamilyConnection = typeof familyConnections.$inferSelect;
export type InsertFamilyConnection = z.infer<typeof insertFamilyConnectionSchema>;
export type InvitationCode = typeof invitationCodes.$inferSelect;
export type InsertInvitationCode = z.infer<typeof insertInvitationCodeSchema>;
