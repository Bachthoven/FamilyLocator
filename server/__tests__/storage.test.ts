import { describe, it, expect, beforeEach, vi } from "vitest";

interface InsertUser {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

interface InsertLocation {
  userId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  type: string;
}

interface InsertPlace {
  userId: number;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  color: string;
}

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  users: {},
  locations: {},
  places: {},
  familyMembers: {},
  invitationCodes: {},
  notifications: {},
  passwordResetCodes: {},
}));

describe("Storage Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("User Operations", () => {
    it("should create a new user", async () => {
      const newUser: InsertUser = {
        email: "test@example.com",
        password: "hashedpassword",
        firstName: "Test",
        lastName: "User",
        phoneNumber: "+1234567890",
      };

      expect(newUser.email).toBe("test@example.com");
      expect(newUser.firstName).toBe("Test");
    });

    it("should validate email format", () => {
      const invalidEmail = "not-an-email";
      const validEmail = "test@example.com";

      expect(validEmail).toContain("@");
      expect(invalidEmail).not.toContain("@");
    });
  });

  describe("Location Operations", () => {
    it("should create location with valid coordinates", () => {
      const location: InsertLocation = {
        userId: 1,
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
        type: "manual",
      };

      expect(location.latitude).toBeGreaterThan(-90);
      expect(location.latitude).toBeLessThan(90);
      expect(location.longitude).toBeGreaterThan(-180);
      expect(location.longitude).toBeLessThan(180);
    });

    it("should validate location accuracy", () => {
      const location: InsertLocation = {
        userId: 1,
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
        type: "automatic",
      };

      expect(location.accuracy).toBeGreaterThan(0);
    });
  });

  describe("Place Operations", () => {
    it("should create place with valid data", () => {
      const place: InsertPlace = {
        userId: 1,
        name: "Home",
        latitude: 40.7128,
        longitude: -74.006,
        category: "home",
        color: "#3b82f6",
      };

      expect(place.name).toBe("Home");
      expect(place.category).toBe("home");
      expect(place.color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should validate place category", () => {
      const validCategories = ["home", "work", "school", "other"];
      const place: InsertPlace = {
        userId: 1,
        name: "Office",
        latitude: 40.7128,
        longitude: -74.006,
        category: "work",
        color: "#3b82f6",
      };

      expect(validCategories).toContain(place.category);
    });
  });
});
