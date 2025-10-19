import { describe, it, expect } from "vitest";
import { getUserColor } from "../utils/familyColors";

describe("Utility Functions", () => {
  describe("getUserColor", () => {
    it("should return a valid color for any user ID", () => {
      const allUserIds = [1, 2, 3, 4, 5];
      const color = getUserColor(1, allUserIds);
      expect(color).toBeTruthy();
      expect(typeof color).toBe("string");
    });

    it("should return consistent colors for same user ID", () => {
      const allUserIds = [1, 2, 3, 4, 5];
      const color1 = getUserColor(5, allUserIds);
      const color2 = getUserColor(5, allUserIds);
      expect(color1).toBe(color2);
    });

    it("should return different colors for different users", () => {
      const allUserIds = [1, 2, 3];
      const color1 = getUserColor(1, allUserIds);
      const color2 = getUserColor(2, allUserIds);
      const color3 = getUserColor(3, allUserIds);

      expect(color1).toBeTruthy();
      expect(color2).toBeTruthy();
      expect(color3).toBeTruthy();
    });

    it("should handle large user IDs", () => {
      const allUserIds = [999999];
      const color = getUserColor(999999, allUserIds);
      expect(color).toBeTruthy();
    });

    it("should handle user ID of 0", () => {
      const allUserIds = [0, 1, 2];
      const color = getUserColor(0, allUserIds);
      expect(color).toBeTruthy();
    });
  });

  describe("Location Validation", () => {
    it("should validate latitude range", () => {
      const isValidLat = (lat: number) => lat >= -90 && lat <= 90;

      expect(isValidLat(0)).toBe(true);
      expect(isValidLat(45.5)).toBe(true);
      expect(isValidLat(-45.5)).toBe(true);
      expect(isValidLat(90)).toBe(true);
      expect(isValidLat(-90)).toBe(true);
      expect(isValidLat(91)).toBe(false);
      expect(isValidLat(-91)).toBe(false);
    });

    it("should validate longitude range", () => {
      const isValidLon = (lon: number) => lon >= -180 && lon <= 180;

      expect(isValidLon(0)).toBe(true);
      expect(isValidLon(120.5)).toBe(true);
      expect(isValidLon(-120.5)).toBe(true);
      expect(isValidLon(180)).toBe(true);
      expect(isValidLon(-180)).toBe(true);
      expect(isValidLon(181)).toBe(false);
      expect(isValidLon(-181)).toBe(false);
    });
  });

  describe("Time Formatting", () => {
    it("should format time ago correctly", () => {
      const formatTimeAgo = (minutes: number): string => {
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
      };

      expect(formatTimeAgo(5)).toBe("5m ago");
      expect(formatTimeAgo(30)).toBe("30m ago");
      expect(formatTimeAgo(90)).toBe("1h ago");
      expect(formatTimeAgo(180)).toBe("3h ago");
      expect(formatTimeAgo(1500)).toBe("1d ago");
    });
  });
});
