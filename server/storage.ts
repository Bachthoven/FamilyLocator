import {
  users,
  locations,
  places,
  familyConnections,
  type User,
  type UpsertUser,
  type Location,
  type InsertLocation,
  type Place,
  type InsertPlace,
  type FamilyConnection,
  type InsertFamilyConnection,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSettings(userId: string, settings: Partial<User>): Promise<User>;
  
  // Location operations
  saveLocation(location: InsertLocation): Promise<Location>;
  getUserLatestLocation(userId: string): Promise<Location | undefined>;
  getFamilyMembersLocations(userId: string): Promise<Array<Location & { user: User }>>;
  
  // Family connection operations
  getFamilyMembers(userId: string): Promise<Array<User>>;
  addFamilyMember(connection: InsertFamilyConnection): Promise<FamilyConnection>;
  acceptFamilyConnection(userId: string, familyMemberId: string): Promise<FamilyConnection>;
  removeFamilyMember(userId: string, familyMemberId: string): Promise<void>;
  
  // Places operations
  getUserPlaces(userId: string): Promise<Place[]>;
  savePlace(place: InsertPlace): Promise<Place>;
  deletePlace(userId: string, placeId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  async updateUserSettings(userId: string, settings: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Location operations
  async saveLocation(location: InsertLocation): Promise<Location> {
    const [savedLocation] = await db
      .insert(locations)
      .values(location)
      .returning();
    return savedLocation;
  }

  async getUserLatestLocation(userId: string): Promise<Location | undefined> {
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.userId, userId))
      .orderBy(desc(locations.timestamp))
      .limit(1);
    return location;
  }

  async getFamilyMembersLocations(userId: string): Promise<Array<Location & { user: User }>> {
    const result = await db
      .select({
        id: locations.id,
        userId: locations.userId,
        latitude: locations.latitude,
        longitude: locations.longitude,
        accuracy: locations.accuracy,
        address: locations.address,
        timestamp: locations.timestamp,
        user: users,
      })
      .from(locations)
      .innerJoin(users, eq(locations.userId, users.id))
      .innerJoin(familyConnections, 
        and(
          eq(familyConnections.familyMemberId, locations.userId),
          eq(familyConnections.userId, userId),
          eq(familyConnections.status, "accepted")
        )
      )
      .where(eq(users.locationSharingEnabled, true))
      .orderBy(desc(locations.timestamp));

    // Get only the latest location for each family member
    const latestLocations = new Map();
    result.forEach(item => {
      if (!latestLocations.has(item.userId)) {
        latestLocations.set(item.userId, item);
      }
    });

    return Array.from(latestLocations.values());
  }

  // Family connection operations
  async getFamilyMembers(userId: string): Promise<Array<User>> {
    const result = await db
      .select({ user: users })
      .from(familyConnections)
      .innerJoin(users, eq(familyConnections.familyMemberId, users.id))
      .where(
        and(
          eq(familyConnections.userId, userId),
          eq(familyConnections.status, "accepted")
        )
      );
    
    return result.map(r => r.user);
  }

  async addFamilyMember(connection: InsertFamilyConnection): Promise<FamilyConnection> {
    const [familyConnection] = await db
      .insert(familyConnections)
      .values(connection)
      .returning();
    return familyConnection;
  }

  async acceptFamilyConnection(userId: string, familyMemberId: string): Promise<FamilyConnection> {
    const [connection] = await db
      .update(familyConnections)
      .set({ status: "accepted" })
      .where(
        and(
          eq(familyConnections.userId, familyMemberId),
          eq(familyConnections.familyMemberId, userId),
          eq(familyConnections.status, "pending")
        )
      )
      .returning();
    return connection;
  }

  async removeFamilyMember(userId: string, familyMemberId: string): Promise<void> {
    await db
      .delete(familyConnections)
      .where(
        or(
          and(
            eq(familyConnections.userId, userId),
            eq(familyConnections.familyMemberId, familyMemberId)
          ),
          and(
            eq(familyConnections.userId, familyMemberId),
            eq(familyConnections.familyMemberId, userId)
          )
        )
      );
  }

  // Places operations
  async getUserPlaces(userId: string): Promise<Place[]> {
    return await db
      .select()
      .from(places)
      .where(eq(places.userId, userId))
      .orderBy(desc(places.createdAt));
  }

  async savePlace(place: InsertPlace): Promise<Place> {
    const [savedPlace] = await db
      .insert(places)
      .values(place)
      .returning();
    return savedPlace;
  }

  async deletePlace(userId: string, placeId: number): Promise<void> {
    await db
      .delete(places)
      .where(
        and(
          eq(places.id, placeId),
          eq(places.userId, userId)
        )
      );
  }
}

export const storage = new DatabaseStorage();
