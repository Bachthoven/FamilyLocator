import { storage } from './storage';

// Calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Return distance in meters
}

// Check if a location is within a geofence (20m radius for precise notifications)
function isWithinGeofence(
  userLat: number,
  userLon: number,
  placeLat: number,
  placeLon: number,
  radiusMeters = 20
): boolean {
  const distance = calculateDistance(userLat, userLon, placeLat, placeLon);
  return distance <= radiusMeters;
}

// Store the last known geofence states for each user
const userGeofenceStates = new Map<string, Set<number>>(); // userId -> Set of place IDs user is currently inside

export async function checkGeofenceTransitions(
  userId: number,
  newLat: number,
  newLon: number
) {
  try {
    // Get all family members' places (not just user's own places)
    const familyPlaces = await storage.getFamilyPlaces(userId);

    console.log(
      `Checking geofences for user ${userId} at ${newLat}, ${newLon}`
    );
    console.log(
      `Found ${familyPlaces?.length || 0} places to check:`,
      familyPlaces?.map((p) => p.name)
    );

    if (!familyPlaces || familyPlaces.length === 0) {
      console.log('No places to check for geofencing');
      return; // No places to check
    }

    const userKey = userId.toString();
    const currentGeofences =
      userGeofenceStates.get(userKey) || new Set<number>();
    const newGeofences = new Set<number>();

    console.log(
      `Current geofence states for user ${userId}:`,
      Array.from(currentGeofences)
    );

    // Check current position against all places
    for (const place of familyPlaces) {
      const distance = calculateDistance(
        newLat,
        newLon,
        place.latitude,
        place.longitude
      );
      const isCurrentlyInside = isWithinGeofence(
        newLat,
        newLon,
        place.latitude,
        place.longitude
      );

      console.log(
        `Place "${place.name}": ${distance.toFixed(1)}m away, inside=${isCurrentlyInside} (20m radius)`
      );

      if (isCurrentlyInside) {
        newGeofences.add(place.id);
      }

      const wasInside = currentGeofences.has(place.id);

      console.log(
        `Place "${place.name}": wasInside=${wasInside}, isCurrentlyInside=${isCurrentlyInside}`
      );

      // Detect transitions (only send one notification per transition)
      if (isCurrentlyInside && !wasInside) {
        // User entered the place
        console.log(
          `🚨 User ${userId} entered place ${place.name} (${place.id})`
        );
        await sendGeofenceNotification(userId, place, 'entered');
      } else if (!isCurrentlyInside && wasInside) {
        // User exited the place
        console.log(
          `🚨 User ${userId} exited place ${place.name} (${place.id})`
        );
        await sendGeofenceNotification(userId, place, 'exited');
      }
    }

    // Update stored state
    userGeofenceStates.set(userKey, newGeofences);
  } catch (error) {
    console.error('Error checking geofence transitions:', error);
  }
}

async function sendGeofenceNotification(
  userId: number,
  place: any,
  action: 'entered' | 'exited'
) {
  try {
    const user = await storage.getUser(userId);
    if (!user) return;

    const message = `${user.firstName || user.email} has ${action} ${place.name}`;
    const title = `Location Alert`;

    console.log(`Geofence notification: ${message}`);

    // Send notification to all family members
    const familyMembers = await storage.getFamilyMembers(userId);

    // Create database notifications for all family members
    for (const familyMember of familyMembers) {
      await storage.createNotification({
        userId: familyMember.id,
        type: `geofence_${action}`,
        title,
        message,
        data: {
          triggeredByUserId: userId,
          placeId: place.id,
          placeName: place.name,
          action,
        },
        isRead: false,
      });
    }

    // Also notify the user who triggered the geofence (for their own records)
    await storage.createNotification({
      userId,
      type: `geofence_${action}`,
      title,
      message: `You ${action === 'entered' ? 'entered' : 'exited'} ${place.name}`,
      data: {
        placeId: place.id,
        placeName: place.name,
        action,
      },
      isRead: false,
    });

    // Broadcast to WebSocket clients for real-time updates
    if ((global as any).broadcastNotification) {
      (global as any).broadcastNotification({
        type: 'geofence',
        userId,
        userName: user.firstName || user.email,
        placeName: place.name,
        action,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error sending geofence notification:', error);
  }
}

export function clearUserGeofenceState(userId: number) {
  userGeofenceStates.delete(userId.toString());
}
