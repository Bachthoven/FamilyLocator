import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemePreference = "light" | "dark" | "system";

interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  effectiveTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType>({
  themePreference: "system",
  setThemePreference: () => {},
  effectiveTheme: "light",
});

const THEME_STORAGE_KEY = "familylocator_theme_preference";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>("system");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (
        savedPreference &&
        ["light", "dark", "system"].includes(savedPreference)
      ) {
        setThemePreferenceState(savedPreference as ThemePreference);
      }
    } catch (error) {
      console.log("Error loading theme preference:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setThemePreference = async (preference: ThemePreference) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
      setThemePreferenceState(preference);
    } catch (error) {
      console.log("Error saving theme preference:", error);
    }
  };

  const effectiveTheme: "light" | "dark" =
    themePreference === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : themePreference;

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        setThemePreference,
        effectiveTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemePreference must be used within a ThemeProvider");
  }
  return context;
}

export function useEffectiveTheme() {
  const { effectiveTheme } = useThemePreference();
  return effectiveTheme;
}
