import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertLocationSchema, insertPlaceSchema, insertFamilyConnectionSchema } from "@shared/schema";
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

  app.post('/api/family/invite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      // Find user by email
      const targetUser = await storage.getUser(email); // This would need to be implemented
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
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
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Remove client from map
      for (const [userId, client] of clients.entries()) {
        if (client === ws) {
          clients.delete(userId);
          break;
        }
      }
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
