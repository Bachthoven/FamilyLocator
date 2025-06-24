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

// Temporary in-memory storage implementation for development
class MemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private locations = new Map<string, Location[]>();
  private places = new Map<string, Place[]>();
  private familyConnections = new Map<string, FamilyConnection[]>();
  private nextId = 1;

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const now = new Date();
    const user: User = {
      ...userData,
      locationSharingEnabled: userData.locationSharingEnabled ?? true,
      locationHistoryEnabled: userData.locationHistoryEnabled ?? true,
      notificationsEnabled: userData.notificationsEnabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUserSettings(userId: string, settings: Partial<User>): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser = { ...user, ...settings, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async saveLocation(location: InsertLocation): Promise<Location> {
    const newLocation: Location = {
      id: this.nextId++,
      ...location,
      timestamp: new Date(),
    };
    
    const userLocations = this.locations.get(location.userId) || [];
    userLocations.push(newLocation);
    this.locations.set(location.userId, userLocations);
    
    return newLocation;
  }

  async getUserLatestLocation(userId: string): Promise<Location | undefined> {
    const userLocations = this.locations.get(userId) || [];
    return userLocations[userLocations.length - 1];
  }

  async getFamilyMembersLocations(userId: string): Promise<Array<Location & { user: User }>> {
    const connections = this.familyConnections.get(userId) || [];
    const acceptedConnections = connections.filter(c => c.status === 'accepted');
    
    const result: Array<Location & { user: User }> = [];
    
    for (const connection of acceptedConnections) {
      const familyMemberId = connection.familyMemberId;
      const user = this.users.get(familyMemberId);
      const location = await this.getUserLatestLocation(familyMemberId);
      
      if (user && location && user.locationSharingEnabled) {
        result.push({ ...location, user });
      }
    }
    
    return result;
  }

  async getFamilyMembers(userId: string): Promise<Array<User>> {
    const connections = this.familyConnections.get(userId) || [];
    const acceptedConnections = connections.filter(c => c.status === 'accepted');
    
    const members: User[] = [];
    for (const connection of acceptedConnections) {
      const user = this.users.get(connection.familyMemberId);
      if (user) members.push(user);
    }
    
    return members;
  }

  async addFamilyMember(connection: InsertFamilyConnection): Promise<FamilyConnection> {
    const newConnection: FamilyConnection = {
      id: this.nextId++,
      ...connection,
      createdAt: new Date(),
    };
    
    const userConnections = this.familyConnections.get(connection.userId) || [];
    userConnections.push(newConnection);
    this.familyConnections.set(connection.userId, userConnections);
    
    return newConnection;
  }

  async acceptFamilyConnection(userId: string, familyMemberId: string): Promise<FamilyConnection> {
    const connections = this.familyConnections.get(userId) || [];
    const connection = connections.find(c => c.familyMemberId === familyMemberId);
    
    if (!connection) throw new Error('Connection not found');
    
    connection.status = 'accepted';
    return connection;
  }

  async removeFamilyMember(userId: string, familyMemberId: string): Promise<void> {
    const connections = this.familyConnections.get(userId) || [];
    const filteredConnections = connections.filter(c => c.familyMemberId !== familyMemberId);
    this.familyConnections.set(userId, filteredConnections);
  }

  async getUserPlaces(userId: string): Promise<Place[]> {
    return this.places.get(userId) || [];
  }

  async savePlace(place: InsertPlace): Promise<Place> {
    const newPlace: Place = {
      id: this.nextId++,
      ...place,
      createdAt: new Date(),
    };
    
    const userPlaces = this.places.get(place.userId) || [];
    userPlaces.push(newPlace);
    this.places.set(place.userId, userPlaces);
    
    return newPlace;
  }

  async deletePlace(userId: string, placeId: number): Promise<void> {
    const userPlaces = this.places.get(userId) || [];
    const filteredPlaces = userPlaces.filter(p => p.id !== placeId);
    this.places.set(userId, filteredPlaces);
  }
}

// Use memory storage temporarily while database issues are resolved
export const storage = new MemoryStorage();

// Keep database storage class for when database is fixed
export const databaseStorage = new DatabaseStorage();
