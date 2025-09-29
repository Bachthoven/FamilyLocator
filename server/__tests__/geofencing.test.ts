import {
  checkGeofenceTransitions,
  clearUserGeofenceState,
} from '../geofencing';
import { storage } from '../storage';

// Mock the storage module
jest.mock('../storage', () => ({
  storage: {
    getFamilyPlaces: jest.fn(),
    getUser: jest.fn(),
    getFamilyMembers: jest.fn(),
    createNotification: jest.fn(),
  },
}));

const mockStorage = storage as jest.Mocked<typeof storage>;

describe('Geofencing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearUserGeofenceState(1);
    clearUserGeofenceState(2);

    // Clear global notification broadcaster
    delete (global as any).broadcastNotification;
  });

  describe('calculateDistance and isWithinGeofence', () => {
    it('should detect when user is within geofence radius', async () => {
      const mockPlace = {
        id: 1,
        name: 'Home',
        latitude: 40.7128,
        longitude: -74.006,
      };

      mockStorage.getFamilyPlaces.mockResolvedValue([mockPlace]);
      mockStorage.getUser.mockResolvedValue({
        id: 1,
        firstName: 'John',
        email: 'john@example.com',
      });
      mockStorage.getFamilyMembers.mockResolvedValue([]);

      // User location within 20m radius (same coordinates)
      await checkGeofenceTransitions(1, 40.7128, -74.006);

      expect(mockStorage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          type: 'geofence_entered',
          title: 'Location Alert',
          message: 'You entered Home',
        })
      );
    });

    it('should not trigger notification when user is outside geofence radius', async () => {
      const mockPlace = {
        id: 1,
        name: 'Home',
        latitude: 40.7128,
        longitude: -74.006,
      };

      mockStorage.getFamilyPlaces.mockResolvedValue([mockPlace]);

      // User location far outside 20m radius
      await checkGeofenceTransitions(1, 40.8128, -74.106);

      expect(mockStorage.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('Geofence state transitions', () => {
    const mockPlace = {
      id: 1,
      name: 'Work',
      latitude: 40.7589,
      longitude: -73.9851,
    };

    const mockUser = {
      id: 1,
      firstName: 'Jane',
      email: 'jane@example.com',
    };

    const mockFamilyMember = {
      id: 2,
      firstName: 'John',
      email: 'john@example.com',
    };

    beforeEach(() => {
      mockStorage.getFamilyPlaces.mockResolvedValue([mockPlace]);
      mockStorage.getUser.mockResolvedValue(mockUser);
      mockStorage.getFamilyMembers.mockResolvedValue([mockFamilyMember]);
    });

    it('should trigger entered notification on first entry', async () => {
      // User enters the geofence
      await checkGeofenceTransitions(1, 40.7589, -73.9851);

      expect(mockStorage.createNotification).toHaveBeenCalledTimes(2);

      // Family member notification
      expect(mockStorage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 2,
          type: 'geofence_entered',
          title: 'Location Alert',
          message: 'Jane has entered Work',
          data: expect.objectContaining({
            triggeredByUserId: 1,
            placeId: 1,
            placeName: 'Work',
            action: 'entered',
          }),
        })
      );

      // User's own notification
      expect(mockStorage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          type: 'geofence_entered',
          message: 'You entered Work',
        })
      );
    });

    it('should trigger exited notification when leaving geofence', async () => {
      // First enter the geofence
      await checkGeofenceTransitions(1, 40.7589, -73.9851);

      // Clear mock calls from entry
      mockStorage.createNotification.mockClear();

      // Then exit the geofence
      await checkGeofenceTransitions(1, 40.8, -74.0);

      expect(mockStorage.createNotification).toHaveBeenCalledTimes(2);

      // Family member notification
      expect(mockStorage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 2,
          type: 'geofence_exited',
          title: 'Location Alert',
          message: 'Jane has exited Work',
          data: expect.objectContaining({
            action: 'exited',
          }),
        })
      );

      // User's own notification
      expect(mockStorage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          type: 'geofence_exited',
          message: 'You exited Work',
        })
      );
    });

    it('should not trigger duplicate notifications when staying within geofence', async () => {
      // Enter geofence
      await checkGeofenceTransitions(1, 40.7589, -73.9851);

      // Clear mock calls
      mockStorage.createNotification.mockClear();

      // Move within geofence (should not trigger notification)
      await checkGeofenceTransitions(1, 40.759, -73.985);

      expect(mockStorage.createNotification).not.toHaveBeenCalled();
    });

    it('should not trigger duplicate notifications when staying outside geofence', async () => {
      // Start outside geofence
      await checkGeofenceTransitions(1, 40.8, -74.0);

      // Move to another location outside geofence
      await checkGeofenceTransitions(1, 40.81, -74.01);

      expect(mockStorage.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('Multiple places handling', () => {
    const mockPlaces = [
      {
        id: 1,
        name: 'Home',
        latitude: 40.7128,
        longitude: -74.006,
      },
      {
        id: 2,
        name: 'Work',
        latitude: 40.7589,
        longitude: -73.9851,
      },
    ];

    const mockUser = {
      id: 1,
      firstName: 'Alice',
      email: 'alice@example.com',
    };

    beforeEach(() => {
      mockStorage.getFamilyPlaces.mockResolvedValue(mockPlaces);
      mockStorage.getUser.mockResolvedValue(mockUser);
      mockStorage.getFamilyMembers.mockResolvedValue([]);
    });

    it('should handle entering multiple geofences simultaneously', async () => {
      // This scenario is unlikely in real world but tests edge case
      // Position that's somehow within both geofences
      await checkGeofenceTransitions(1, 40.7128, -74.006); // At Home

      expect(mockStorage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You entered Home',
        })
      );
    });

    it('should handle transitioning between geofences', async () => {
      // Enter Home
      await checkGeofenceTransitions(1, 40.7128, -74.006);

      mockStorage.createNotification.mockClear();

      // Move to Work (should exit Home and enter Work)
      await checkGeofenceTransitions(1, 40.7589, -73.9851);

      expect(mockStorage.createNotification).toHaveBeenCalledTimes(2);

      const calls = mockStorage.createNotification.mock.calls;
      const messages = calls.map((call) => call[0].message);

      expect(messages).toContain('You exited Home');
      expect(messages).toContain('You entered Work');
    });
  });

  describe('Error handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockStorage.getFamilyPlaces.mockRejectedValue(
        new Error('Database error')
      );

      // Should not throw
      await expect(
        checkGeofenceTransitions(1, 40.7128, -74.006)
      ).resolves.toBeUndefined();
    });

    it('should handle empty places array', async () => {
      mockStorage.getFamilyPlaces.mockResolvedValue([]);

      await checkGeofenceTransitions(1, 40.7128, -74.006);

      expect(mockStorage.createNotification).not.toHaveBeenCalled();
    });

    it('should handle null places response', async () => {
      mockStorage.getFamilyPlaces.mockResolvedValue(null);

      await checkGeofenceTransitions(1, 40.7128, -74.006);

      expect(mockStorage.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('WebSocket broadcasting', () => {
    const mockPlace = {
      id: 1,
      name: 'School',
      latitude: 40.7831,
      longitude: -73.9712,
    };

    const mockUser = {
      id: 1,
      firstName: 'Bob',
      email: 'bob@example.com',
    };

    beforeEach(() => {
      mockStorage.getFamilyPlaces.mockResolvedValue([mockPlace]);
      mockStorage.getUser.mockResolvedValue(mockUser);
      mockStorage.getFamilyMembers.mockResolvedValue([]);
    });

    it('should broadcast geofence notifications when broadcaster is available', async () => {
      const mockBroadcast = jest.fn();
      (global as any).broadcastNotification = mockBroadcast;

      await checkGeofenceTransitions(1, 40.7831, -73.9712);

      expect(mockBroadcast).toHaveBeenCalledWith({
        type: 'geofence',
        userId: 1,
        userName: 'Bob',
        placeName: 'School',
        action: 'entered',
        message: 'Bob has entered School',
        timestamp: expect.any(String),
      });
    });

    it('should work normally when no broadcaster is available', async () => {
      // No broadcaster set
      await checkGeofenceTransitions(1, 40.7831, -73.9712);

      // Should still create database notifications
      expect(mockStorage.createNotification).toHaveBeenCalled();
    });
  });
});
