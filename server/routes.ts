import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertLocationSchema, insertPlaceSchema, insertFamilyConnectionSchema } from "@shared/schema";
import { locationLogger } from "./locationLogger";
import { z } from "zod";

// WebSocket management
const clients = new Map<number, WebSocket[]>();

function broadcastLocationUpdate(userId: number, location: any) {
  // Broadcast to family members
  storage.getFamilyMembers(userId).then(familyMembers => {
    familyMembers.forEach(member => {
      const memberClients = clients.get(member.id) || [];
      memberClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'locationUpdate',
            userId,
            location
          }));
        }
      });
    });
  });
}

// Auth middleware for protected routes
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export function registerRoutes(app: Express): Server {
  // Setup authentication
  setupAuth(app);

  // User settings
  app.patch('/api/user/settings', requireAuth, async (req: any, res) => {
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
  app.post('/api/locations', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  app.get('/api/locations/family', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const familyLocations = await storage.getFamilyMembersLocations(userId);
      res.json(familyLocations);
    } catch (error) {
      console.error("Error fetching family locations:", error);
      res.status(500).json({ message: "Failed to fetch family locations" });
    }
  });

  // Family routes
  app.get('/api/family', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const familyMembers = await storage.getFamilyMembers(userId);
      res.json(familyMembers);
    } catch (error) {
      console.error("Error fetching family members:", error);
      res.status(500).json({ message: "Failed to fetch family members" });
    }
  });

  app.get('/api/family/invitations', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const invitations = await storage.getPendingInvitations(userId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.post('/api/family/invite', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { email } = req.body;
      
      // Find user by email
      const familyMember = await storage.getUserByEmail(email);
      if (!familyMember) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const connectionData = insertFamilyConnectionSchema.parse({
        userId,
        familyMemberId: familyMember.id,
        status: "pending",
      });
      
      const connection = await storage.addFamilyMember(connectionData);
      res.json(connection);
    } catch (error) {
      console.error("Error sending invitation:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  app.post('/api/family/accept', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { familyMemberId } = req.body;
      
      const connection = await storage.acceptFamilyConnection(userId, familyMemberId);
      res.json(connection);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  app.delete('/api/family/:memberId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const memberId = parseInt(req.params.memberId);
      
      await storage.removeFamilyMember(userId, memberId);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error removing family member:", error);
      res.status(500).json({ message: "Failed to remove family member" });
    }
  });

  // Places routes
  app.get('/api/places', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const places = await storage.getUserPlaces(userId);
      res.json(places);
    } catch (error) {
      console.error("Error fetching places:", error);
      res.status(500).json({ message: "Failed to fetch places" });
    }
  });

  app.post('/api/places', requireAuth, async (req: any, res) => {
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

  app.delete('/api/places/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const placeId = parseInt(req.params.id);
      
      await storage.deletePlace(userId, placeId);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting place:", error);
      res.status(500).json({ message: "Failed to delete place" });
    }
  });

  const httpServer = createServer(app);

  // Setup WebSocket server on a specific path to avoid conflicts with Vite
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/api/ws' 
  });

  wss.on('connection', (ws: WebSocket, request) => {
    console.log('WebSocket client connected to /api/ws');

    ws.on('message', async (message: any) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth' && data.userId) {
          const userId = parseInt(data.userId);
          console.log(`User ${userId} registered for WebSocket updates`);
          
          // Add client to user's connection list
          if (!clients.has(userId)) {
            clients.set(userId, []);
          }
          clients.get(userId)!.push(ws);

          // Start hourly location logging if user has it enabled
          const user = await storage.getUser(userId);
          if (user?.locationHistoryEnabled) {
            console.log(`Starting hourly location logging for user ${userId}`);
            locationLogger.startHourlyLogging(userId);
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      
      // Remove client from all user lists
      for (const [userId, userClients] of clients.entries()) {
        const index = userClients.indexOf(ws);
        if (index !== -1) {
          userClients.splice(index, 1);
          
          // Stop hourly logging if no more clients for this user
          if (userClients.length === 0) {
            console.log(`Stopped hourly location logging for user ${userId}`);
            locationLogger.stopHourlyLogging(userId);
            clients.delete(userId);
          }
          break;
        }
      }
    });
  });

  return httpServer;
}