// API Configuration for Mobile App
import Constants from "expo-constants";

// Get API URL from Expo config or use default
const getApiUrl = () => {
  // Check if we have a custom API URL from Expo config
  if (Constants.expoConfig?.extra?.API_URL) {
    return Constants.expoConfig.extra.API_URL;
  }

  // For Replit: Use the dev domain from manifest
  // Expo Go uses the manifest.debuggerHost to communicate with the dev server
  const debuggerHost =
    Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;

  if (debuggerHost) {
    // Extract the host (remove port if present)
    const host = debuggerHost.split(":")[0];

    // If it's a Replit domain, use HTTPS
    if (host.includes("replit.dev")) {
      return `https://${host}`;
    }

    // For local network (IP addresses), use HTTP with port 5000
    if (host.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return `http://${host}:5000`;
    }

    // Default: use HTTP with the host and port 5000
    return `http://${host}:5000`;
  }

  // Fallback for simulator
  return "http://localhost:5000";
};

export const API_URL = getApiUrl();

// Log API URL for debugging (remove in production)
if (__DEV__) {
  console.log("[API Config] API_URL:", API_URL);
  console.log(
    "[API Config] debuggerHost:",
    Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost
  );
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
