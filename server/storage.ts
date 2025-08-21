import {
  users,
  locations,
  places,
  familyConnections,
  invitationCodes,
  notifications,
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
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSettings(userId: number, settings: Partial<User>): Promise<User>;
  updateUserProfile(userId: number, profile: Partial<User>): Promise<User>;
  
  // Location operations
  saveLocation(location: InsertLocation): Promise<Location>;
  getUserLatestLocation(userId: number): Promise<Location | undefined>;
  getFamilyMembersLocations(userId: number): Promise<Array<Location & { user: User }>>;
  getFamilyLocationHistory(userId: number): Promise<Record<string, { user: User; locations: Array<Location & { user: User }> }>>;
  
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
  updatePlaceLocation(placeId: number, latitude: number, longitude: number): Promise<void>;
  updatePlace(placeId: number, updates: { name?: string; category?: string; color?: string }): Promise<void>;
  
  // Invitation code operations
  createInvitationCode(invitation: InsertInvitationCode): Promise<InvitationCode>;
  getInvitationByCode(code: string): Promise<InvitationCode | undefined>;
  useInvitationCode(code: string, userId: number): Promise<InvitationCode>;
  getUserActiveCodes(userId: number): Promise<InvitationCode[]>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number, limit?: number): Promise<Notification[]>;
  markNotificationAsRead(userId: number, notificationId: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  getUnreadNotificationCount(userId: number): Promise<number>;
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

  async updateUserProfile(userId: number, profile: Partial<User>): Promise<User> {
    const updateData: any = { ...profile, updatedAt: new Date() };
    
    // If currentPassword is provided, it means the password hash should be updated
    if ((profile as any).currentPassword) {
      updateData.password = (profile as any).currentPassword;
      delete updateData.currentPassword;
    }
    
    const [user] = await db
      .update(users)
      .set(updateData)
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

  async getUserPreviousLocation(userId: number): Promise<Location | undefined> {
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.userId, userId))
      .orderBy(desc(locations.timestamp))
      .limit(1)
      .offset(1);
    return location;
  }

  async getAllFamilyPlaces(userId: number): Promise<Place[]> {
    // Get all places from family members (including user's own places)
    const familyMembers = await db
      .select({ familyMemberId: familyConnections.familyMemberId })
      .from(familyConnections)
      .where(and(
        eq(familyConnections.userId, userId),
        eq(familyConnections.status, 'accepted')
      ));

    const familyMemberIds = [userId, ...familyMembers.map(fm => fm.familyMemberId)];
    
    if (familyMemberIds.length === 1) {
      // Only user's own places
      return await db
        .select()
        .from(places)
        .where(eq(places.userId, userId));
    }
    
    return await db
      .select()
      .from(places)
      .where(inArray(places.userId, familyMemberIds));
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

  async getFamilyLocationHistory(userId: number): Promise<Record<string, { user: User; locations: Array<Location & { user: User }> }>> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
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
      .where(
        and(
          eq(users.locationSharingEnabled, true),
          sql`${locations.timestamp} >= ${twentyFourHoursAgo}`
        )
      )
      .orderBy(desc(locations.timestamp));

    // Group locations by user ID
    const groupedHistory: Record<string, { user: User; locations: Array<Location & { user: User }> }> = {};
    
    result.forEach(item => {
      const userIdStr = item.userId.toString();
      if (!groupedHistory[userIdStr]) {
        groupedHistory[userIdStr] = {
          user: item.user,
          locations: []
        };
      }
      groupedHistory[userIdStr].locations.push(item);
    });

    // Filter to include only hourly locations (approximately)
    Object.keys(groupedHistory).forEach(userIdStr => {
      const userHistory = groupedHistory[userIdStr];
      const filteredLocations: Array<Location & { user: User }> = [];
      let lastIncludedTime = 0;
      
      userHistory.locations.forEach(location => {
        const locationTime = new Date(location.timestamp || new Date()).getTime();
        const timeDiff = Math.abs(locationTime - lastIncludedTime);
        const oneHour = 60 * 60 * 1000;
        
        // Include location if it's the first one or if it's been more than 45 minutes since the last included location
        if (lastIncludedTime === 0 || timeDiff >= oneHour * 0.75) {
          filteredLocations.push(location);
          lastIncludedTime = locationTime;
        }
      });
      
      groupedHistory[userIdStr].locations = filteredLocations;
    });

    return groupedHistory;
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

  async getFamilyPlaces(userId: number): Promise<Array<Place & { user: User }>> {
    // Get all family members
    const familyMembers = await this.getFamilyMembers(userId);
    const familyMemberIds = [userId, ...familyMembers.map(member => member.id)];
    
    // Get places for all family members using inArray instead of SQL ANY
    const result = await db
      .select({
        id: places.id,
        userId: places.userId,
        name: places.name,
        address: places.address,
        latitude: places.latitude,
        longitude: places.longitude,
        category: places.category,
        color: places.color,
        createdAt: places.createdAt,
        user: users,
      })
      .from(places)
      .innerJoin(users, eq(places.userId, users.id))
      .where(inArray(places.userId, familyMemberIds))
      .orderBy(desc(places.createdAt));
    
    return result;
  }

  async savePlace(place: InsertPlace): Promise<Place> {
    const [savedPlace] = await db
      .insert(places)
      .values(place)
      .returning();
    return savedPlace;
  }

  async deletePlace(userId: number, placeId: number): Promise<void> {
    // Allow family members to delete any place (places are shared among family)
    await db
      .delete(places)
      .where(eq(places.id, placeId));
  }
  
  async updatePlaceLocation(placeId: number, latitude: number, longitude: number): Promise<void> {
    await db
      .update(places)
      .set({ latitude, longitude })
      .where(eq(places.id, placeId));
  }

  async updatePlace(placeId: number, updates: { name?: string; category?: string; color?: string }): Promise<void> {
    await db
      .update(places)
      .set(updates)
      .where(eq(places.id, placeId));
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
  
  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async getUserNotifications(userId: number, limit = 50): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markNotificationAsRead(userId: number, notificationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      );
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    return result.count;
  }
}

export const storage = new DatabaseStorage();