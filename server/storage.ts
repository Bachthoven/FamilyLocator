import {
  users,
  locations,
  places,
  familyConnections,
  invitationCodes,
  type User,
  type InsertUser,
  type Location,
  type InsertLocation,
  type Place,
  type InsertPlace,
  type FamilyConnection,
  type InsertFamilyConnection,
  type InvitationCode,
  type InsertInvitationCode,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, sql } from "drizzle-orm";

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
  
  // Invitation code operations
  createInvitationCode(invitation: InsertInvitationCode): Promise<InvitationCode>;
  getInvitationByCode(code: string): Promise<InvitationCode | undefined>;
  useInvitationCode(code: string, userId: number): Promise<InvitationCode>;
  getUserActiveCodes(userId: number): Promise<InvitationCode[]>;
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
    const result = await db
      .select({
        id: locations.id,
        userId: locations.userId,
        latitude: locations.latitude,
        longitude: locations.longitude,
        accuracy: locations.accuracy,
        address: locations.address,
        type: locations.type,
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
  async getFamilyMembers(userId: number): Promise<Array<User>> {
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

  async getPendingInvitations(userId: number): Promise<Array<FamilyConnection & { user: User }>> {
    const result = await db
      .select({
        id: familyConnections.id,
        userId: familyConnections.userId,
        familyMemberId: familyConnections.familyMemberId,
        status: familyConnections.status,
        createdAt: familyConnections.createdAt,
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
    
    return result;
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
          eq(familyConnections.userId, familyMemberId),
          eq(familyConnections.familyMemberId, userId),
          eq(familyConnections.status, "pending")
        )
      )
      .returning();
    return connection;
  }

  async removeFamilyMember(userId: number, familyMemberId: number): Promise<void> {
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
  
  // Invitation code operations
  async createInvitationCode(invitation: InsertInvitationCode): Promise<InvitationCode> {
    const [code] = await db
      .insert(invitationCodes)
      .values(invitation)
      .returning();
    return code;
  }
  
  async getInvitationByCode(code: string): Promise<InvitationCode | undefined> {
    const [invitation] = await db
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.code, code));
    return invitation;
  }
  
  async useInvitationCode(code: string, userId: number): Promise<InvitationCode> {
    const [usedCode] = await db
      .update(invitationCodes)
      .set({ 
        usedAt: new Date(),
        usedById: userId 
      })
      .where(eq(invitationCodes.code, code))
      .returning();
    return usedCode;
  }
  
  async getUserActiveCodes(userId: number): Promise<InvitationCode[]> {
    return await db
      .select()
      .from(invitationCodes)
      .where(
        and(
          eq(invitationCodes.userId, userId),
          sql`${invitationCodes.usedAt} IS NULL`,
          sql`${invitationCodes.expiresAt} > NOW()`
        )
      );
  }
}

export const storage = new DatabaseStorage();