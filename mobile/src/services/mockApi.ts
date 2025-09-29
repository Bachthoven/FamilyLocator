// Mock API service for testing without backend
import { User } from '../types/schema';

// Mock user data for testing
const mockUsers: { [email: string]: User } = {
  'test@example.com': {
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: '+1234567890',
    profileImageUrl: null,
    locationSharingEnabled: true,
    locationHistoryEnabled: true,
    notificationsEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

const mockPassword = 'password123';

export class MockApiService {
  async login(email: string, password: string) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const user = mockUsers[email];
    if (!user || password !== mockPassword) {
      throw new Error('Invalid credentials');
    }

    return {
      user,
      sessionToken: 'mock-session-token-' + Date.now(),
    };
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (mockUsers[userData.email]) {
      throw new Error('User already exists');
    }

    const newUser: User = {
      id: Object.keys(mockUsers).length + 1,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phoneNumber: null,
      profileImageUrl: null,
      locationSharingEnabled: true,
      locationHistoryEnabled: true,
      notificationsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUsers[userData.email] = newUser;

    return {
      user: newUser,
      sessionToken: 'mock-session-token-' + Date.now(),
    };
  }

  async logout() {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true };
  }

  // Mock other API methods
  async updateLocation(locationData: any) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { id: 1, ...locationData, timestamp: new Date() };
  }

  async getLocationHistory() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return [];
  }

  async getFamilyMembers() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return [];
  }

  async getFamilyLocations() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return [];
  }

  async generateInviteCode() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      id: 1,
      code: 'ABC123',
      userId: 1,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      usedAt: null,
      usedById: null,
      createdAt: new Date(),
    };
  }

  async joinFamily(inviteCode: string) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true, message: 'Successfully joined family!' };
  }

  async removeFamilyMember(memberId: number) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true };
  }

  async getPlaces() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return [];
  }

  async createPlace(placeData: any) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { id: 1, ...placeData, createdAt: new Date() };
  }

  async updatePlace(placeId: number, placeData: any) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true };
  }

  async deletePlace(placeId: number) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true };
  }

  async getNotifications() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return [];
  }

  async markNotificationRead(notificationId: number) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true };
  }

  async updatePushToken(expoPushToken: string) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { message: 'Push token registered successfully' };
  }

  async updateProfile(profileData: any) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true };
  }
}
