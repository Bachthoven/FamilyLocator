import { storage } from './storage';

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Return distance in meters
}

// Check if a location is within a geofence (temporarily using 100m radius for testing)
function isWithinGeofence(userLat: number, userLon: number, placeLat: number, placeLon: number, radiusMeters = 100): boolean {
  const distance = calculateDistance(userLat, userLon, placeLat, placeLon);
  return distance <= radiusMeters;
}

// Store the last known geofence states for each user
const userGeofenceStates = new Map<string, Set<number>>(); // userId -> Set of place IDs user is currently inside

export async function checkGeofenceTransitions(userId: number, newLat: number, newLon: number) {
  try {
    // Get all family members' places (not just user's own places)
    const familyPlaces = await storage.getFamilyPlaces(userId);
    
    console.log(`Checking geofences for user ${userId} at ${newLat}, ${newLon}`);
    console.log(`Found ${familyPlaces?.length || 0} places to check:`, familyPlaces?.map(p => p.name));
    
    if (!familyPlaces || familyPlaces.length === 0) {
      console.log('No places to check for geofencing');
      return; // No places to check
    }

    const userKey = userId.toString();
    const currentGeofences = userGeofenceStates.get(userKey) || new Set<number>();
    const newGeofences = new Set<number>();
    
    console.log(`Current geofence states for user ${userId}:`, Array.from(currentGeofences));

    // Check current position against all places
    for (const place of familyPlaces) {
      const distance = calculateDistance(newLat, newLon, place.latitude, place.longitude);
      const isCurrentlyInside = isWithinGeofence(newLat, newLon, place.latitude, place.longitude);
      
      console.log(`Place "${place.name}": ${distance.toFixed(1)}m away, inside=${isCurrentlyInside} (100m radius)`);
      
      if (isCurrentlyInside) {
        newGeofences.add(place.id);
      }

      const wasInside = currentGeofences.has(place.id);
      
      console.log(`Place "${place.name}": wasInside=${wasInside}, isCurrentlyInside=${isCurrentlyInside}`);
      
      // Detect transitions (only send one notification per transition)
      if (isCurrentlyInside && !wasInside) {
        // User entered the place
        console.log(`🚨 User ${userId} entered place ${place.name} (${place.id})`);
        await sendGeofenceNotification(userId, place, 'entered');
      } else if (!isCurrentlyInside && wasInside) {
        // User exited the place
        console.log(`🚨 User ${userId} exited place ${place.name} (${place.id})`);
        await sendGeofenceNotification(userId, place, 'exited');
      }
    }

    // Update stored state
    userGeofenceStates.set(userKey, newGeofences);

  } catch (error) {
    console.error('Error checking geofence transitions:', error);
  }
}

async function sendGeofenceNotification(userId: number, place: any, action: 'entered' | 'exited') {
  try {
    const user = await storage.getUser(userId);
    if (!user) return;

    const message = `${user.firstName || user.email} is ${action === 'entered' ? 'entering' : 'exiting'} ${place.name}`;
    
    console.log(`Geofence notification: ${message}`);
    
    // Send notification to all family members
    const familyMembers = await storage.getFamilyMembers(userId);
    
    // Broadcast to WebSocket clients
    if ((global as any).broadcastNotification) {
      (global as any).broadcastNotification({
        type: 'geofence',
        userId,
        userName: user.firstName || user.email,
        placeName: place.name,
        action,
        message,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error sending geofence notification:', error);
  }
}

export function clearUserGeofenceState(userId: number) {
  userGeofenceStates.delete(userId.toString());
}