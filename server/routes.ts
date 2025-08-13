import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertLocationSchema, insertPlaceSchema, insertFamilyConnectionSchema } from "@shared/schema";
import { locationLogger } from "./locationLogger";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

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
      const locationData = insertLocationSchema.parse({
        ...req.body,
        userId,
      });
      
      const location = await storage.saveLocation(locationData);
      
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
      
      // Create bidirectional family connection
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
      const places = await storage.getUserPlaces(userId);
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
          console.log(`User ${data.userId} registered for WebSocket updates`);
          
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

  return httpServer;
}
