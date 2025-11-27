import { useColorScheme } from "react-native";

export type StatusBarStyleType = "light" | "dark";

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryForeground: string;
  statusBarStyle: StatusBarStyleType;
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarInactive: string;
  controlButtonBackground: string;
  controlButtonBorder: string;
  controlButtonIcon: string;
  dialogBackground: string;
  dialogBorder: string;
  dialogText: string;
  dialogTextSecondary: string;
  dialogTextMuted: string;
  avatarBackground: string;
  cardBackground: string;
  headerBackground: string;
  headerBorder: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  skeletonBackground: string;
  compassBackground: string;
  compassNorth: string;
  compassSouth: string;
}

export const lightColors: ThemeColors = {
  background: "#F9FAFB",
  surface: "#FFFFFF",
  surfaceSecondary: "#F3F4F6",
  text: "#1F2937",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  primary: "#0EA5E9",
  primaryForeground: "#FFFFFF",
  statusBarStyle: "dark",
  tabBarBackground: "#FFFFFF",
  tabBarBorder: "#F3F4F6",
  tabBarInactive: "#6B7280",
  controlButtonBackground: "#FFFFFF",
  controlButtonBorder: "#F3F4F6",
  controlButtonIcon: "#333333",
  dialogBackground: "#FFFFFF",
  dialogBorder: "#F3F4F6",
  dialogText: "#1F2937",
  dialogTextSecondary: "#6B7280",
  dialogTextMuted: "#9CA3AF",
  avatarBackground: "#D1D5DB",
  cardBackground: "#F3F4F6",
  headerBackground: "#FFFFFF",
  headerBorder: "#F3F4F6",
  inputBackground: "#FFFFFF",
  inputBorder: "#E5E7EB",
  inputText: "#1F2937",
  inputPlaceholder: "#9CA3AF",
  skeletonBackground: "#E5E7EB",
  compassBackground: "#FFFFFF",
  compassNorth: "#EF4444",
  compassSouth: "#9CA3AF",
};

export const darkColors: ThemeColors = {
  background: "#111827",
  surface: "#1F2937",
  surfaceSecondary: "#374151",
  text: "#F9FAFB",
  textSecondary: "#D1D5DB",
  textMuted: "#9CA3AF",
  border: "#374151",
  primary: "#0EA5E9",
  primaryForeground: "#FFFFFF",
  statusBarStyle: "light",
  tabBarBackground: "#1F2937",
  tabBarBorder: "#2D3748",
  tabBarInactive: "#9CA3AF",
  controlButtonBackground: "#1F2937",
  controlButtonBorder: "#2D3748",
  controlButtonIcon: "#F9FAFB",
  dialogBackground: "#1F2937",
  dialogBorder: "#2D3748",
  dialogText: "#F9FAFB",
  dialogTextSecondary: "#D1D5DB",
  dialogTextMuted: "#9CA3AF",
  avatarBackground: "#9CA3AF",
  cardBackground: "#374151",
  headerBackground: "#1F2937",
  headerBorder: "#2D3748",
  inputBackground: "#374151",
  inputBorder: "#4B5563",
  inputText: "#F9FAFB",
  inputPlaceholder: "#9CA3AF",
  skeletonBackground: "#374151",
  compassBackground: "#1F2937",
  compassNorth: "#EF4444",
  compassSouth: "#6B7280",
};

export function useThemeColors(): ThemeColors {
  const colorScheme = useColorScheme();
  return colorScheme === "dark" ? darkColors : lightColors;
}

export function useIsDarkMode(): boolean {
  const colorScheme = useColorScheme();
  return colorScheme === "dark";
}
