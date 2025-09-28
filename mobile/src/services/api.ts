import * as SecureStore from 'expo-secure-store';
import { MockApiService } from './mockApi';

const API_BASE_URL = __DEV__ ? 'http://192.168.0.14:3000/api' : 'https://your-production-url.com/api';
const USE_MOCK_API = true; // Set to false when backend is ready

// Initialize mock API service
const mockApiService = new MockApiService();

class ApiService {
  private async getAuthHeaders() {
    const token = await SecureStore.getItemAsync('sessionToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string) {
    if (USE_MOCK_API) {
      return mockApiService.login(email, password);
    }
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    if (USE_MOCK_API) {
      return mockApiService.register(userData);
    }
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout() {
    if (USE_MOCK_API) {
      return mockApiService.logout();
    }
    return this.makeRequest('/auth/logout', {
      method: 'POST',
    });
  }

  // Location services
  async updateLocation(locationData: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  }) {
    return this.makeRequest('/locations', {
      method: 'POST',
      body: JSON.stringify({
        ...locationData,
        type: 'automatic',
      }),
    });
  }

  async getLocationHistory(limit = 50) {
    return this.makeRequest(`/locations/history?limit=${limit}`);
  }

  // Family services
  async getFamilyMembers() {
    return this.makeRequest('/family/members');
  }

  async getFamilyLocations() {
    return this.makeRequest('/family/locations');
  }

  async generateInviteCode() {
    return this.makeRequest('/family/invite-code', {
      method: 'POST',
    });
  }

  async joinFamily(inviteCode: string) {
    return this.makeRequest('/family/join', {
      method: 'POST',
      body: JSON.stringify({ code: inviteCode }),
    });
  }

  async removeFamilyMember(memberId: number) {
    return this.makeRequest(`/family/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  // Places services
  async getPlaces() {
    return this.makeRequest('/places');
  }

  async createPlace(placeData: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    category?: string;
    color?: string;
  }) {
    return this.makeRequest('/places', {
      method: 'POST',
      body: JSON.stringify(placeData),
    });
  }

  async updatePlace(placeId: number, placeData: Partial<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    category: string;
    color: string;
  }>) {
    return this.makeRequest(`/places/${placeId}`, {
      method: 'PUT',
      body: JSON.stringify(placeData),
    });
  }

  async deletePlace(placeId: number) {
    return this.makeRequest(`/places/${placeId}`, {
      method: 'DELETE',
    });
  }

  // Notifications
  async getNotifications() {
    return this.makeRequest('/notifications');
  }

  async markNotificationRead(notificationId: number) {
    return this.makeRequest(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async updatePushToken(expoPushToken: string) {
    return this.makeRequest('/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({ pushToken: expoPushToken }),
    });
  }

  // User profile
  async updateProfile(profileData: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    locationSharingEnabled?: boolean;
    locationHistoryEnabled?: boolean;
    notificationsEnabled?: boolean;
  }) {
    return this.makeRequest('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }
}

export const apiService = new ApiService();