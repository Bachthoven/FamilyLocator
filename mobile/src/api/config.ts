// API Configuration for Mobile App
import Constants from 'expo-constants';

// Get API URL from Expo config or use default
const getApiUrl = () => {
  // In Expo Go, we need to use your computer's IP address
  // Replace with your actual IP when testing on physical device
  const devUrl = 'http://localhost:5000'; // For simulator
  // const devUrl = 'http://192.168.1.XXX:5000'; // For physical device - replace XXX with your IP
  
  return Constants.expoConfig?.extra?.API_URL || devUrl;
};

export const API_URL = getApiUrl();

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_USER: `${API_URL}/api/auth/user`,
  AUTH_LOGIN: `${API_URL}/api/auth/login`,
  AUTH_LOGOUT: `${API_URL}/api/auth/logout`,
  
  // Locations
  LOCATIONS: `${API_URL}/api/locations`,
  CURRENT_LOCATION: `${API_URL}/api/locations/current`,
  LOCATION_HISTORY: `${API_URL}/api/locations/history`,
  
  // Family
  FAMILY: `${API_URL}/api/family`,
  FAMILY_CONNECTIONS: `${API_URL}/api/family/connections`,
  FAMILY_INVITATIONS: `${API_URL}/api/family/invitations`,
  
  // Places
  PLACES: `${API_URL}/api/places`,
  
  // Health check
  HEALTH: `${API_URL}/api/health`,
};

// Helper function for API requests
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  };
  
  return fetch(endpoint, defaultOptions);
}