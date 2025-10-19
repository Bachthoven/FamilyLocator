import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  isUserInsideGeofence,
  checkGeofenceTransitions,
} from "../geofencing";
import type { Place } from "@shared/schema";

describe("Geofencing Module", () => {
  describe("calculateDistance", () => {
    it("should calculate accurate distance between two coordinates", () => {
      const distance = calculateDistance(
        40.7128, // NYC latitude
        -74.006, // NYC longitude
        34.0522, // LA latitude
        -118.2437 // LA longitude
      );

      expect(distance).toBeGreaterThan(3900000); // ~3900km
      expect(distance).toBeLessThan(4100000);
    });

    it("should return ~0 for same coordinates", () => {
      const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(distance).toBeLessThan(1);
    });

    it("should calculate short distances accurately", () => {
      const distance = calculateDistance(
        40.7128,
        -74.006,
        40.7138, // ~1.1km north
        -74.006
      );

      expect(distance).toBeGreaterThan(1000);
      expect(distance).toBeLessThan(1200);
    });
  });

  describe("isUserInsideGeofence", () => {
    it("should detect user inside geofence", () => {
      const isInside = isUserInsideGeofence(
        40.7128,
        -74.006,
        40.7129, // 11m away
        -74.0061,
        100 // 100m radius
      );

      expect(isInside).toBe(true);
    });

    it("should detect user outside geofence", () => {
      const isInside = isUserInsideGeofence(
        40.7128,
        -74.006,
        40.7628, // ~5km away
        -74.006,
        100 // 100m radius
      );

      expect(isInside).toBe(false);
    });
  });

  describe("checkGeofenceTransitions", () => {
    const mockPlace: Place & { id: number } = {
      id: 1,
      userId: 1,
      name: "Home",
      address: "123 Main St",
      latitude: 40.7128,
      longitude: -74.006,
      category: "home",
      color: "#3b82f6",
      createdAt: new Date(),
    };

    it("should detect entry into geofence", () => {
      const previousState = new Set<number>();
      const currentLocation = { latitude: 40.7129, longitude: -74.0061 };

      const { entered, exited } = checkGeofenceTransitions(
        [mockPlace],
        currentLocation,
        previousState
      );

      expect(entered).toContain(1);
      expect(exited).toHaveLength(0);
    });

    it("should detect exit from geofence", () => {
      const previousState = new Set([1]);
      const currentLocation = { latitude: 40.7628, longitude: -74.006 };

      const { entered, exited } = checkGeofenceTransitions(
        [mockPlace],
        currentLocation,
        previousState
      );

      expect(entered).toHaveLength(0);
      expect(exited).toContain(1);
    });

    it("should handle empty places array", () => {
      const { entered, exited } = checkGeofenceTransitions(
        [],
        { latitude: 40.7128, longitude: -74.006 },
        new Set()
      );

      expect(entered).toHaveLength(0);
      expect(exited).toHaveLength(0);
    });
  });
});
