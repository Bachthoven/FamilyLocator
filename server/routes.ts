import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertLocationSchema, insertPlaceSchema, insertFamilyConnectionSchema } from "@shared/schema";
import { locationLogger } from "./locationLogger";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User settings
  app.patch('/api/user/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
          locationLogger.startHourlyLogging(userId);
        } else {
          locationLogger.stopHourlyLogging(userId);
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
      const userId = req.user.claims.sub;
      const locationData = insertLocationSchema.parse({
        ...req.body,
        userId,
      });
      
      const location = await storage.saveLocation(locationData);
      
      // Broadcast location update to family members via WebSocket
      broadcastLocationUpdate(userId, location);
      
      res.json(location);
    } catch (error) {
      console.error("Error saving location:", error);
      res.status(500).json({ message: "Failed to save location" });
    }
  });

  app.get('/api/locations/current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const locations = await storage.getFamilyMembersLocations(userId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching family locations:", error);
      res.status(500).json({ message: "Failed to fetch family locations" });
    }
  });

  // Family member routes
  app.get('/api/family', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyMembers = await storage.getFamilyMembers(userId);
      res.json(familyMembers);
    } catch (error) {
      console.error("Error fetching family members:", error);
      res.status(500).json({ message: "Failed to fetch family members" });
    }
  });

  // Get pending invitations received by this user
  app.get('/api/family/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invitations = await storage.getPendingInvitations(userId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.post('/api/family/invite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      // Find user by email
      const targetUser = await storage.getUserByEmail(email);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found. They need to sign up first." });
      }
      
      // Check if connection already exists
      const existingMembers = await storage.getFamilyMembers(userId);
      if (existingMembers.some(member => member.id === targetUser.id)) {
        return res.status(400).json({ message: "User is already in your family" });
      }
      
      const connection = await storage.addFamilyMember({
        userId,
        familyMemberId: targetUser.id,
        status: "pending",
      });
      
      res.json(connection);
    } catch (error) {
      console.error("Error inviting family member:", error);
      res.status(500).json({ message: "Failed to invite family member" });
    }
  });

  app.post('/api/family/accept/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { memberId } = req.params;
      
      const connection = await storage.acceptFamilyConnection(userId, memberId);
      res.json(connection);
    } catch (error) {
      console.error("Error accepting family connection:", error);
      res.status(500).json({ message: "Failed to accept family connection" });
    }
  });

  app.delete('/api/family/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { memberId } = req.params;
      
      await storage.removeFamilyMember(userId, memberId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing family member:", error);
      res.status(500).json({ message: "Failed to remove family member" });
    }
  });

  // Places routes
  app.get('/api/places', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const places = await storage.getUserPlaces(userId);
      res.json(places);
    } catch (error) {
      console.error("Error fetching places:", error);
      res.status(500).json({ message: "Failed to fetch places" });
    }
  });

  app.post('/api/places', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const placeId = parseInt(req.params.placeId);
      
      await storage.deletePlace(userId, placeId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting place:", error);
      res.status(500).json({ message: "Failed to delete place" });
    }
  });

  // Hourly location logging control routes
  app.post('/api/location-logging/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      locationLogger.startHourlyLogging(userId);
      res.json({ message: "Hourly location logging started", success: true });
    } catch (error) {
      console.error("Error starting location logging:", error);
      res.status(500).json({ message: "Failed to start location logging" });
    }
  });

  app.post('/api/location-logging/stop', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      locationLogger.stopHourlyLogging(userId);
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
          clients.set(data.userId, ws);
          console.log(`User ${data.userId} registered for WebSocket updates`);
          
          // Auto-start hourly location logging for users with location history enabled
          storage.getUser(data.userId).then(user => {
            if (user && user.locationHistoryEnabled) {
              locationLogger.startHourlyLogging(data.userId);
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
          // Stop hourly logging when user disconnects
          locationLogger.stopHourlyLogging(userId);
        }
      });
      console.log('WebSocket client disconnected');
    });
  });

  // Function to broadcast location updates
  function broadcastLocationUpdate(userId: string, location: any) {
    // Get family members of this user and send update
    storage.getFamilyMembers(userId).then(familyMembers => {
      familyMembers.forEach(member => {
        const client = clients.get(member.id);
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

  return httpServer;
}
