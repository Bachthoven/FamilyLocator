import {
  users,
  locations,
  places,
  familyConnections,
  type User,
  type InsertUser,
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
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSettings(userId: number, settings: Partial<User>): Promise<User>;
  
  // Location operations
  saveLocation(location: InsertLocation): Promise<Location>;
  getUserLatestLocation(userId: number): Promise<Location | undefined>;
  getFamilyMembersLocations(userId: number): Promise<Array<Location & { user: User }>>;
  
  // Family connection operations
  getFamilyMembers(userId: number): Promise<Array<User>>;
  getPendingInvitations(userId: number): Promise<Array<FamilyConnection & { user: User }>>;
  addFamilyMember(connection: InsertFamilyConnection): Promise<FamilyConnection>;
  acceptFamilyConnection(userId: number, familyMemberId: number): Promise<FamilyConnection>;
  removeFamilyMember(userId: number, familyMemberId: number): Promise<void>;
  
  // Places operations
  getUserPlaces(userId: number): Promise<Place[]>;
  savePlace(place: InsertPlace): Promise<Place>;
  deletePlace(userId: number, placeId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUserSettings(userId: number, settings: Partial<User>): Promise<User> {
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

  async getUserLatestLocation(userId: number): Promise<Location | undefined> {
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.userId, userId))
      .orderBy(desc(locations.timestamp))
      .limit(1);
    return location;
  }

  async getFamilyMembersLocations(userId: number): Promise<Array<Location & { user: User }>> {
    // Get accepted family connections
    const familyMemberIds = await db
      .select({ id: familyConnections.familyMemberId })
      .from(familyConnections)
      .where(
        and(
          eq(familyConnections.userId, userId),
          eq(familyConnections.status, "accepted")
        )
      );

    if (familyMemberIds.length === 0) {
      return [];
    }

    // Get the latest location for each family member
    const latestLocations = await db
      .select({
        location: locations,
        user: users,
      })
      .from(locations)
      .innerJoin(users, eq(locations.userId, users.id))
      .where(
        or(...familyMemberIds.map(member => eq(locations.userId, member.id)))
      )
      .orderBy(desc(locations.timestamp));

    // Group by user and get the latest location for each
    const userLatestLocations = new Map();
    for (const result of latestLocations) {
      if (!userLatestLocations.has(result.user.id)) {
        userLatestLocations.set(result.user.id, {
          ...result.location,
          user: result.user,
        });
      }
    }

    return Array.from(userLatestLocations.values());
  }

  // Family connection operations
  async getFamilyMembers(userId: number): Promise<Array<User>> {
    const connections = await db
      .select({ user: users })
      .from(familyConnections)
      .innerJoin(users, eq(familyConnections.familyMemberId, users.id))
      .where(
        and(
          eq(familyConnections.userId, userId),
          eq(familyConnections.status, "accepted")
        )
      );

    return connections.map(conn => conn.user);
  }

  async getPendingInvitations(userId: number): Promise<Array<FamilyConnection & { user: User }>> {
    const invitations = await db
      .select({
        connection: familyConnections,
        user: users,
      })
      .from(familyConnections)
      .innerJoin(users, eq(familyConnections.userId, users.id))
      .where(
        and(
          eq(familyConnections.familyMemberId, userId),
          eq(familyConnections.status, "pending")
        )
      );

    return invitations.map(inv => ({
      ...inv.connection,
      user: inv.user,
    }));
  }

  async addFamilyMember(connection: InsertFamilyConnection): Promise<FamilyConnection> {
    const [familyConnection] = await db
      .insert(familyConnections)
      .values(connection)
      .returning();
    return familyConnection;
  }

  async acceptFamilyConnection(userId: number, familyMemberId: number): Promise<FamilyConnection> {
    const [connection] = await db
      .update(familyConnections)
      .set({ status: "accepted" })
      .where(
        and(
          eq(familyConnections.familyMemberId, userId),
          eq(familyConnections.userId, familyMemberId)
        )
      )
      .returning();

    // Create the reverse connection for bidirectional relationship
    await db
      .insert(familyConnections)
      .values({
        userId: userId,
        familyMemberId: familyMemberId,
        status: "accepted",
      })
      .onConflictDoNothing();

    return connection;
  }

  async removeFamilyMember(userId: number, familyMemberId: number): Promise<void> {
    // Remove both directions of the connection
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
  async getUserPlaces(userId: number): Promise<Place[]> {
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

  async deletePlace(userId: number, placeId: number): Promise<void> {
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