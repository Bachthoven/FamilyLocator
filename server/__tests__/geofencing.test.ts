import { describe, it, expect } from "vitest";

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

describe("Geofencing", () => {
  describe("Distance Calculation", () => {
    it("should calculate distance between two points", () => {
      const lat1 = 40.7128;
      const lon1 = -74.006;
      const lat2 = 40.7614;
      const lon2 = -73.9776;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10000);
    });

    it("should return 0 for same coordinates", () => {
      const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);

      expect(distance).toBeLessThan(1);
    });

    it("should detect proximity within geofence radius", () => {
      const placeLat = 40.7128;
      const placeLon = -74.006;
      const userLat = 40.7129;
      const userLon = -74.0061;
      const geofenceRadius = 100;

      const distance = calculateDistance(placeLat, placeLon, userLat, userLon);

      expect(distance).toBeLessThan(geofenceRadius);
    });

    it("should detect when outside geofence radius", () => {
      const placeLat = 40.7128;
      const placeLon = -74.006;
      const userLat = 40.7628;
      const userLon = -74.006;
      const geofenceRadius = 100;

      const distance = calculateDistance(placeLat, placeLon, userLat, userLon);

      expect(distance).toBeGreaterThan(geofenceRadius);
    });
  });

  describe("Geofence State Management", () => {
    it("should track entry into geofence", () => {
      const userState = {
        userId: 1,
        insideGeofences: new Set<number>(),
      };

      const placeId = 1;
      userState.insideGeofences.add(placeId);

      expect(userState.insideGeofences.has(placeId)).toBe(true);
    });

    it("should track exit from geofence", () => {
      const userState = {
        userId: 1,
        insideGeofences: new Set([1, 2, 3]),
      };

      const placeId = 2;
      userState.insideGeofences.delete(placeId);

      expect(userState.insideGeofences.has(placeId)).toBe(false);
      expect(userState.insideGeofences.size).toBe(2);
    });
  });
});
