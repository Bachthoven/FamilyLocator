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
}

export const lightColors: ThemeColors = {
  background: "#FFFFFF",
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
  tabBarBorder: "#E5E7EB",
  tabBarInactive: "#6B7280",
  controlButtonBackground: "#FFFFFF",
  controlButtonBorder: "#E5E7EB",
  controlButtonIcon: "#333333",
  dialogBackground: "#FFFFFF",
  dialogBorder: "#E5E7EB",
  dialogText: "#1F2937",
  dialogTextSecondary: "#6B7280",
  dialogTextMuted: "#9CA3AF",
  avatarBackground: "#9CA3AF",
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
  tabBarBorder: "#374151",
  tabBarInactive: "#9CA3AF",
  controlButtonBackground: "#1F2937",
  controlButtonBorder: "#374151",
  controlButtonIcon: "#F9FAFB",
  dialogBackground: "#1F2937",
  dialogBorder: "#374151",
  dialogText: "#F9FAFB",
  dialogTextSecondary: "#D1D5DB",
  dialogTextMuted: "#9CA3AF",
  avatarBackground: "#9CA3AF",
};

export function useThemeColors(): ThemeColors {
  const colorScheme = useColorScheme();
  return colorScheme === "dark" ? darkColors : lightColors;
}

export function useIsDarkMode(): boolean {
  const colorScheme = useColorScheme();
  return colorScheme === "dark";
}
