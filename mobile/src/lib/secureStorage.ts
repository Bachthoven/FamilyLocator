import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "familylocator_auth_token";

// In-memory token for synchronous access
let currentToken: string | null = null;

export const secureStorage = {
  async saveAuthToken(token: string): Promise<void> {
    try {
      currentToken = token;
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    } catch (error) {
      console.error("Error saving auth token:", error);
      throw error;
    }
  },

  async getAuthToken(): Promise<string | null> {
    try {
      if (currentToken) return currentToken;
      currentToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      return currentToken;
    } catch (error) {
      console.error("Error retrieving auth token:", error);
      return null;
    }
  },

  async deleteAuthToken(): Promise<void> {
    try {
      currentToken = null;
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error("Error deleting auth token:", error);
      throw error;
    }
  },

  // Synchronous access to current token (for API requests)
  getCurrentToken(): string | null {
    return currentToken;
  },

  setCurrentToken(token: string | null): void {
    currentToken = token;
  },
};
