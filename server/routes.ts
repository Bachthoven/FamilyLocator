import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertLocationSchema, insertPlaceSchema, insertFamilyConnectionSchema, insertNotificationSchema, passwordResetCodes, users } from "@shared/schema";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { db } from "./db";
import { locationLogger } from "./locationLogger";
import { z } from "zod";
import { checkGeofenceTransitions } from "./geofencing";
import { ObjectStorageService } from "./objectStorage.js";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Profile update routes
  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profileSchema = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phoneNumber: z.string().optional(),
        profileImageUrl: z.string().optional(),
        currentPassword: z.string().optional(),
        newPassword: z.string().min(6).optional(),
      });
      
      const profileData = profileSchema.parse(req.body);
      
      // If changing password, verify current password
      if (profileData.newPassword && profileData.currentPassword) {
        const user = await storage.getUser(userId);
        if (!user || !(await comparePasswords(profileData.currentPassword, user.password))) {
          return res.status(400).json({ message: "The current password you entered is wrong. Please try again." });
        }
        
        // Hash new password
        profileData.currentPassword = await hashPassword(profileData.newPassword);
        delete profileData.newPassword;
      }
      
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Forgot Password Routes
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "No account found with this email address" });
      }

      // Check if user has a phone number
      if (!user.phoneNumber) {
        return res.status(400).json({ message: "This account doesn't have a phone number. Please contact support." });
      }

      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store the code in database
      await db.insert(passwordResetCodes).values({
        email,
        code,
        expiresAt,
      });

      // TODO: In a real implementation, you would send the code via SMS
      // For now, we'll just log it to console for testing
      console.log(`Password reset code for ${email} (${user.phoneNumber}): ${code}`);
      
      res.json({ 
        message: "Verification code sent to your phone",
        // For testing purposes only - remove in production
        testCode: process.env.NODE_ENV === 'development' ? code : undefined
      });
    } catch (error) {
      console.error("Error sending reset code:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email, code, newPassword } = z.object({
        email: z.string().email(),
        code: z.string().min(6).max(6),
        newPassword: z.string().min(6)
      }).parse(req.body);

      // Find the reset code
      const [resetCode] = await db
        .select()
        .from(passwordResetCodes)
        .where(
          and(
            eq(passwordResetCodes.email, email),
            eq(passwordResetCodes.code, code),
            gte(passwordResetCodes.expiresAt, new Date()),
            sql`${passwordResetCodes.usedAt} IS NULL`
          )
        );

      if (!resetCode) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user's password
      await db
        .update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.email, email));

      // Mark the reset code as used
      await db
        .update(passwordResetCodes)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetCodes.id, resetCode.id));

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Object storage routes
  app.post('/api/objects/upload', isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.put('/api/profile-image', isAuthenticated, async (req: any, res) => {
    if (!req.body.profileImageURL) {
      return res.status(400).json({ error: "profileImageURL is required" });
    }

    const userId = req.user.id;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.profileImageURL,
        {
          owner: userId.toString(),
          visibility: "public", // Profile images are public
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting profile image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve private objects (profile images)
  app.get('/objects/:objectPath(*)', async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      res.status(404).json({ error: "Object not found" });
    }
  });

  // User settings
  app.patch('/api/user/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const settingsSchema = z.object({
        locationSharingEnabled: z.boolean().optional(),
        locationHistoryEnabled: z.boolean().optional(),
        notificationsEnabled: z.boolean().optional(),
      });
      
      const settings = settingsSchema.parse(req.body);
      const user = await storage.updateUserSettings(userId, settings);
      
      // Start or stop hourly logging based on location history setting
      if (settings.locationHistoryEnabled !== undefined) {
        if (settings.locationHistoryEnabled) {
          locationLogger.startHourlyLogging(userId.toString());
        } else {
          locationLogger.stopHourlyLogging(userId.toString());
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Location routes
  app.post('/api/locations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('Saving location for user:', userId, 'data:', req.body);
      const locationData = insertLocationSchema.parse({
        ...req.body,
        userId,
      });
      
      const location = await storage.saveLocation(locationData);
      console.log('Saved location successfully:', location);
      
      // Get user info for notifications
      const user = await storage.getUser(userId);
      const userName = user?.firstName || user?.email || 'User';
      
      // Create location update notification for family members only (not self) and limit frequency
      const familyMembers = await storage.getFamilyMembers(userId);
      
      // Only create location notifications for significant moves (not every ping)
      // Check if this is the first location or if it's been more than 5 minutes since last notification
      const lastNotificationTime = (global as any).lastLocationNotification?.[userId] || 0;
      const currentTime = Date.now();
      const timeSinceLastNotification = currentTime - lastNotificationTime;
      const shouldCreateNotification = timeSinceLastNotification > 5 * 60 * 1000; // 5 minutes
      
      if (shouldCreateNotification && familyMembers.length > 0) {
        // Initialize global tracking object if it doesn't exist
        if (!(global as any).lastLocationNotification) {
          (global as any).lastLocationNotification = {};
        }
        (global as any).lastLocationNotification[userId] = currentTime;
        
        for (const familyMember of familyMembers) {
          try {
            await storage.createNotification({
              userId: familyMember.id,
              type: 'location',
              title: 'Location Update',
              message: `${userName} updated their location`,
              data: { locationId: location.id, userId: userId },
              isRead: false
            });
            console.log(`Created location notification for family member ${familyMember.id}`);
            
            // Broadcast notification via WebSocket for real-time updates
            if ((global as any).broadcastNotification) {
              (global as any).broadcastNotification({
                type: 'notification',
                userId: familyMember.id,
                notificationType: 'location',
                message: `${userName} updated their location`,
                timestamp: new Date().toISOString()
              });
            }
          } catch (notificationError) {
            console.error(`Failed to create location notification for user ${familyMember.id}:`, notificationError);
          }
        }
      }
      
      // Check for geofence transitions
      await checkGeofenceTransitions(userId, location.latitude, location.longitude);
      
      // Broadcast location update to family members via WebSocket
      broadcastLocationUpdate(userId.toString(), location);
      
      res.json(location);
    } catch (error) {
      console.error("Error saving location:", error);
      res.status(500).json({ message: "Failed to save location" });
    }
  });

  app.get('/api/locations/current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentLocation = await storage.getUserLatestLocation(userId);
      if (!currentLocation) {
        return res.status(404).json({ message: "No location data found" });
      }
      res.json(currentLocation);
    } catch (error) {
      console.error("Error fetching current location:", error);
      res.status(500).json({ message: "Failed to fetch current location" });
    }
  });

  app.get('/api/locations/family', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('Fetching family locations for user:', userId);
      const locations = await storage.getFamilyMembersLocations(userId);
      console.log('Found family locations:', locations);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching family locations:", error);
      res.status(500).json({ message: "Failed to fetch family locations" });
    }
  });

  // Get location history for family members in the past 24 hours
  app.get('/api/locations/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('Fetching location history for user:', userId);
      const history = await storage.getFamilyLocationHistory(userId);
      console.log('Location history result:', Object.keys(history).length, 'family members');
      res.json(history);
    } catch (error) {
      console.error("Error fetching location history:", error);
      res.status(500).json({ message: "Failed to fetch location history" });
    }
  });

  // Clear geofence state for testing
  app.post('/api/geofence/clear', isAuthenticated, async (req: any, res) => {
    try {
      const { clearUserGeofenceState } = await import('./geofencing');
      clearUserGeofenceState(req.user.id);
      console.log('Cleared geofence state for user:', req.user.id);
      res.json({ message: 'Geofence state cleared' });
    } catch (error) {
      console.error("Error clearing geofence state:", error);
      res.status(500).json({ message: "Failed to clear geofence state" });
    }
  });

  // Family member routes
  app.get('/api/family', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('Fetching family members for user:', userId);
      const familyMembers = await storage.getFamilyMembers(userId);
      console.log('Found family members:', familyMembers);
      res.json(familyMembers);
    } catch (error) {
      console.error("Error fetching family members:", error);
      res.status(500).json({ message: "Failed to fetch family members" });
    }
  });

  // Get pending invitations received by this user
  app.get('/api/family/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const invitations = await storage.getPendingInvitations(userId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Generate invitation code
  app.post('/api/family/generate-code', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Generate random 6-character code
      const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
      let code = generateCode();
      
      // Ensure code is unique
      let existingCode = await storage.getInvitationByCode(code);
      while (existingCode) {
        code = generateCode();
        existingCode = await storage.getInvitationByCode(code);
      }
      
      // Set expiration to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      console.log('Creating invitation code with data:', { code, userId, expiresAt });
      
      const invitationCode = await storage.createInvitationCode({
        code,
        userId,
        expiresAt,
      });
      
      res.json(invitationCode);
    } catch (error) {
      console.error("Error generating invitation code:", error);
      res.status(500).json({ message: "Failed to generate invitation code" });
    }
  });

  // Get user's invitation codes
  app.get('/api/family/codes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('Fetching invitation codes for user:', userId);
      const codes = await storage.getUserActiveCodes(userId);
      console.log('Found invitation codes:', codes);
      res.json(codes);
    } catch (error) {
      console.error("Error fetching invitation codes:", error);
      res.status(500).json({ message: "Failed to fetch invitation codes" });
    }
  });

  // Join family using invitation code
  app.post('/api/family/join', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
      
      // Find the invitation code
      const invitation = await storage.getInvitationByCode(code.toUpperCase());
      if (!invitation) {
        return res.status(404).json({ message: "Invalid invitation code" });
      }
      
      // Check if code has expired
      if (new Date() > invitation.expiresAt) {
        return res.status(400).json({ message: "Invitation code has expired" });
      }
      
      // Check if code has been used
      if (invitation.usedAt) {
        return res.status(400).json({ message: "Invitation code has already been used" });
      }
      
      // Check if user is trying to join their own family
      if (invitation.userId === userId) {
        return res.status(400).json({ message: "You cannot use your own invitation code" });
      }
      
      // Check if connection already exists
      const existingMembers = await storage.getFamilyMembers(userId);
      if (existingMembers.some(member => member.id === invitation.userId)) {
        return res.status(400).json({ message: "You are already connected to this family member" });
      }
      
      // Get all family members of the inviter to connect the new user to everyone
      const inviterFamilyMembers = await storage.getFamilyMembers(invitation.userId);
      
      // Create connections between the new user and the inviter
      await storage.addFamilyMember({
        userId: invitation.userId,
        familyMemberId: userId,
        status: "accepted",
      });
      
      await storage.addFamilyMember({
        userId: userId,
        familyMemberId: invitation.userId,
        status: "accepted",
      });
      
      // Create connections between the new user and all existing family members
      for (const familyMember of inviterFamilyMembers) {
        // Skip if already connected (shouldn't happen, but safety check)
        if (familyMember.id === userId) continue;
        
        await storage.addFamilyMember({
          userId: familyMember.id,
          familyMemberId: userId,
          status: "accepted",
        });
        
        await storage.addFamilyMember({
          userId: userId,
          familyMemberId: familyMember.id,
          status: "accepted",
        });
      }
      
      // Mark invitation code as used
      await storage.useInvitationCode(code.toUpperCase(), userId);
      
      res.json({ success: true, message: "Successfully joined family!" });
    } catch (error) {
      console.error("Error joining family:", error);
      res.status(500).json({ message: "Failed to join family" });
    }
  });

  // Get user's active invitation codes
  app.get('/api/family/codes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const codes = await storage.getUserActiveCodes(userId);
      res.json(codes);
    } catch (error) {
      console.error("Error fetching invitation codes:", error);
      res.status(500).json({ message: "Failed to fetch invitation codes" });
    }
  });

  app.post('/api/family/accept/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { memberId } = req.params;
      
      const connection = await storage.acceptFamilyConnection(userId, parseInt(memberId));
      res.json(connection);
    } catch (error) {
      console.error("Error accepting family connection:", error);
      res.status(500).json({ message: "Failed to accept family connection" });
    }
  });

  app.delete('/api/family/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { memberId } = req.params;
      
      await storage.removeFamilyMember(userId, parseInt(memberId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing family member:", error);
      res.status(500).json({ message: "Failed to remove family member" });
    }
  });

  // Places routes
  app.get('/api/places', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const places = await storage.getFamilyPlaces(userId);
      res.json(places);
    } catch (error) {
      console.error("Error fetching places:", error);
      res.status(500).json({ message: "Failed to fetch places" });
    }
  });

  app.post('/api/places', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const placeData = insertPlaceSchema.parse({
        ...req.body,
        userId,
      });
      
      const place = await storage.savePlace(placeData);
      res.json(place);
    } catch (error) {
      console.error("Error saving place:", error);
      res.status(500).json({ message: "Failed to save place" });
    }
  });

  app.delete('/api/places/:placeId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const placeId = parseInt(req.params.placeId);
      
      await storage.deletePlace(userId, placeId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting place:", error);
      res.status(500).json({ message: "Failed to delete place" });
    }
  });

  // Update place details (name, category, color)
  app.patch('/api/places/:placeId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const placeId = parseInt(req.params.placeId);
      const { name, category, color } = req.body;
      
      // Validate input
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Place name is required" });
      }
      
      // Check if place belongs to user or their family
      const places = await storage.getFamilyPlaces(userId);
      const place = places?.find(p => p.id === placeId);
      
      if (!place) {
        return res.status(404).json({ message: "Place not found" });
      }
      
      // Update the place details
      await storage.updatePlace(placeId, { name, category, color });
      
      console.log(`Updated place ${placeId} details`);
      res.json({ message: "Place updated successfully" });
    } catch (error) {
      console.error("Error updating place:", error);
      res.status(500).json({ message: "Failed to update place" });
    }
  });

  // Update place location (for drag and drop)
  app.patch('/api/places/:id/location', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const placeId = parseInt(req.params.id);
      const { latitude, longitude } = req.body;
      
      // Validate coordinates
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      // Check if place belongs to user or their family
      const places = await storage.getFamilyPlaces(userId);
      const place = places?.find(p => p.id === placeId);
      
      if (!place) {
        return res.status(404).json({ message: "Place not found" });
      }
      
      // Allow any family member to update shared places
      // The place was already verified to belong to the family in getFamilyPlaces
      
      // Update the place coordinates
      await storage.updatePlaceLocation(placeId, latitude, longitude);
      
      console.log(`Updated place ${placeId} location to ${latitude}, ${longitude}`);
      res.json({ message: "Place location updated successfully" });
    } catch (error) {
      console.error("Error updating place location:", error);
      res.status(500).json({ message: "Failed to update place location" });
    }
  });

  // Hourly location logging control routes
  app.post('/api/location-logging/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      locationLogger.startHourlyLogging(userId.toString());
      res.json({ message: "Hourly location logging started", success: true });
    } catch (error) {
      console.error("Error starting location logging:", error);
      res.status(500).json({ message: "Failed to start location logging" });
    }
  });

  app.post('/api/location-logging/stop', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      locationLogger.stopHourlyLogging(userId.toString());
      res.json({ message: "Hourly location logging stopped", success: true });
    } catch (error) {
      console.error("Error stopping location logging:", error);
      res.status(500).json({ message: "Failed to stop location logging" });
    }
  });

  app.get('/api/location-logging/status', isAuthenticated, async (req: any, res) => {
    try {
      const activeSessions = locationLogger.getActiveSessions();
      res.json({ activeSessions });
    } catch (error) {
      console.error("Error getting logging status:", error);
      res.status(500).json({ message: "Failed to get logging status" });
    }
  });

  // Clear user geofence state (for testing)
  app.post('/api/geofence/clear', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { clearUserGeofenceState } = await import('./geofencing');
      clearUserGeofenceState(userId);
      console.log(`Cleared geofence state for user ${userId}`);
      res.json({ message: "Geofence state cleared successfully" });
    } catch (error) {
      console.error("Error clearing geofence state:", error);
      res.status(500).json({ message: "Failed to clear geofence state" });
    }
  });

  // Test geofence notification (for debugging)
  app.post('/api/geofence/test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Broadcast test notification
      if ((global as any).broadcastNotification) {
        (global as any).broadcastNotification({
          type: 'geofence',
          userId,
          userName: user.firstName || user.email,
          placeName: 'Test Location',
          action: 'entered',
          message: `${user.firstName || user.email} has entered Test Location`,
          timestamp: new Date().toISOString()
        });
      }

      res.json({ message: "Test notification sent" });
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ message: "Failed to get logging status" });
    }
  });

  // Create sample notification for testing styling
  app.post('/api/notifications/test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create a sample notification
      const notification = await storage.createNotification({
        userId,
        type: 'geofence',
        title: 'Location Alert',
        message: `${user.firstName || user.email} entered Test Location`,
        data: null,
        isRead: false
      });

      res.json({ message: "Test notification created", notification });
    } catch (error) {
      console.error("Error creating test notification:", error);
      res.status(500).json({ message: "Failed to create test notification" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getUserNotifications(userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.post('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notificationData = insertNotificationSchema.parse({
        ...req.body,
        userId
      });
      const notification = await storage.createNotification(notificationData);
      res.json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  app.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error getting unread notification count:", error);
      res.status(500).json({ message: "Failed to get unread notification count" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(userId, notificationId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch('/api/notifications/mark-all-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Mobile-specific routes

  // Register/update push notification token
  app.post('/api/notifications/push-token', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { pushToken } = z.object({ pushToken: z.string() }).parse(req.body);

      // Store push token for this user (you may want to add a pushTokens table)
      // For now, we'll update the user record or store in memory
      console.log(`Registered push token for user ${userId}: ${pushToken}`);

      // TODO: Store push token in database
      res.json({ message: "Push token registered successfully" });
    } catch (error) {
      console.error("Error registering push token:", error);
      res.status(500).json({ message: "Failed to register push token" });
    }
  });

  // Mobile-friendly family member endpoints
  app.get('/api/family/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const familyMembers = await storage.getFamilyMembers(userId);
      res.json(familyMembers);
    } catch (error) {
      console.error("Error fetching family members:", error);
      res.status(500).json({ message: "Failed to fetch family members" });
    }
  });

  app.get('/api/family/locations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const locations = await storage.getFamilyMembersLocations(userId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching family locations:", error);
      res.status(500).json({ message: "Failed to fetch family locations" });
    }
  });

  app.post('/api/family/invite-code', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Generate random 6-character code
      const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
      let code = generateCode();

      // Ensure code is unique
      let existingCode = await storage.getInvitationByCode(code);
      while (existingCode) {
        code = generateCode();
        existingCode = await storage.getInvitationByCode(code);
      }

      // Set expiration to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const invitationCode = await storage.createInvitationCode({
        code,
        userId,
        expiresAt,
      });

      res.json(invitationCode);
    } catch (error) {
      console.error("Error generating invitation code:", error);
      res.status(500).json({ message: "Failed to generate invitation code" });
    }
  });

  app.delete('/api/family/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { memberId } = req.params;

      await storage.removeFamilyMember(userId, parseInt(memberId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing family member:", error);
      res.status(500).json({ message: "Failed to remove family member" });
    }
  });

  // Mobile-friendly places endpoints
  app.put('/api/places/:placeId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const placeId = parseInt(req.params.placeId);
      const updateData = req.body;

      // Check if place belongs to user or their family
      const places = await storage.getFamilyPlaces(userId);
      const place = places?.find(p => p.id === placeId);

      if (!place) {
        return res.status(404).json({ message: "Place not found" });
      }

      // Update the place
      await storage.updatePlace(placeId, updateData);
      res.json({ message: "Place updated successfully" });
    } catch (error) {
      console.error("Error updating place:", error);
      res.status(500).json({ message: "Failed to update place" });
    }
  });

  // Get location history with pagination for mobile
  app.get('/api/locations/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const history = await storage.getUserLocationHistory(userId, limit, offset);
      res.json(history);
    } catch (error) {
      console.error("Error fetching location history:", error);
      res.status(500).json({ message: "Failed to fetch location history" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time location updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth' && data.userId) {
          clients.set(data.userId.toString(), ws);
          console.log(`User ${data.userId} registered for WebSocket updates. Total clients: ${clients.size}`);
          
          // Auto-start hourly location logging for users with location history enabled
          storage.getUser(parseInt(data.userId)).then(user => {
            if (user && user.locationHistoryEnabled) {
              locationLogger.startHourlyLogging(data.userId.toString());
            }
          }).catch(error => {
            console.error(`Error checking user settings for ${data.userId}:`, error);
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Remove client from map and stop location logging
      clients.forEach((client, userId) => {
        if (client === ws) {
          clients.delete(userId);
          console.log(`User ${userId} disconnected. Total clients: ${clients.size}`);
          // Stop hourly logging when user disconnects
          locationLogger.stopHourlyLogging(userId);
        }
      });
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Function to broadcast location updates
  function broadcastLocationUpdate(userId: string, location: any) {
    // Get family members of this user and send update
    storage.getFamilyMembers(parseInt(userId)).then(familyMembers => {
      familyMembers.forEach(member => {
        const client = clients.get(member.id.toString());
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'locationUpdate',
            userId,
            location,
          }));
        }
      });
    });
  }

  // Function to broadcast notifications (for geofencing)
  (global as any).broadcastNotification = function(notification: any) {
    console.log(`Broadcasting notification to ${clients.size} connected clients:`, notification);
    clients.forEach((client, userId) => {
      if (client.readyState === WebSocket.OPEN) {
        const message = {
          type: 'geofence',
          ...notification,
        };
        console.log(`Sending notification to user ${userId}:`, message);
        client.send(JSON.stringify(message));
      }
    });
  };

  return httpServer;
}
