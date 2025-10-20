import * as SecureStore from "expo-secure-store";

const SESSION_TOKEN_KEY = "familylocator_session_token";

export const secureStorage = {
  async saveSessionToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    } catch (error) {
      console.error("Error saving session token:", error);
      throw error;
    }
  },

  async getSessionToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
    } catch (error) {
      console.error("Error retrieving session token:", error);
      return null;
    }
  },

  async deleteSessionToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    } catch (error) {
      console.error("Error deleting session token:", error);
      throw error;
    }
  },
};
