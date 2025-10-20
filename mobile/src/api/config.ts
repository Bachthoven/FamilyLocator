// API Configuration for Mobile App
import Constants from "expo-constants";

// Get API URL from Expo config or use default
const getApiUrl = () => {
  // Check if we have a custom API URL from Expo config
  if (Constants.expoConfig?.extra?.API_URL) {
    return Constants.expoConfig.extra.API_URL;
  }

  // IMPORTANT: For Expo Go on Replit, we need the actual Replit backend domain
  // The Expo tunnel (exp.direct) is only for the Metro bundler, NOT the backend API

  // For Replit: Use the actual backend domain (HTTPS)
  // You can set this in app.json under "extra.API_URL" or it will auto-detect from environment
  const replitDomain =
    "36067de9-4e94-4471-bf75-fa394b5267d0-00-1xeyu4xa0l9cp.spock.replit.dev";

  // Return the Replit backend URL with HTTPS
  return `https://${replitDomain}`;
};

export const API_URL = getApiUrl();

// Log API URL for debugging (remove in production)
if (__DEV__) {
  console.log("[API Config] API_URL:", API_URL);
  console.log("[API Config] Backend should be accessible at this domain");
}

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
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
    ...options,
  };

  return fetch(endpoint, defaultOptions);
}
