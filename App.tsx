import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./mobile/src/lib/queryClient";
import { AuthProvider, useAuth } from "./mobile/src/contexts/AuthContext";
import CustomTabBar from "./mobile/components/CustomTabBar";
import MapScreen from "./mobile/screens/MapScreen";
import FamilyScreen from "./mobile/screens/FamilyScreen";
import PlacesScreen from "./mobile/screens/PlacesScreen";
import HistoryScreen from "./mobile/screens/HistoryScreen";
import SettingsScreen from "./mobile/screens/SettingsScreen";
import AuthScreen from "./mobile/screens/AuthScreen";
import { useThemeColors } from "./mobile/theme/colors";

type TabName = "Map" | "Family" | "Places" | "History" | "Settings";

function AppContent() {
  const { user, isLoading } = useAuth();
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const [activeTab, setActiveTab] = useState<TabName>("Map");
  const [focusLocation, setFocusLocation] = useState<{
    latitude: number;
    longitude: number;
    userId: number;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapRegion, setMapRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [mapType, setMapType] = useState<"standard" | "hybrid">("standard");

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color="#0EA5E9" />
        <StatusBar style={colors.statusBarStyle} />
      </View>
    );
  }

  // Show authentication screen if not logged in
  if (!user) {
    return <AuthScreen />;
  }

  // Handle navigation from Family to Map with location focus
  const handleNavigateToMap = (location: {
    latitude: number;
    longitude: number;
    userId: number;
  }) => {
    setFocusLocation(location);
    setActiveTab("Map");
  };

  // Show main app if logged in
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Keep all screens mounted but hide inactive ones to preserve state */}
      <View style={activeTab === "Map" ? styles.screen : styles.hiddenScreen}>
        <MapScreen
          focusLocation={focusLocation}
          onLocationFocused={() => setFocusLocation(null)}
          userLocation={userLocation}
          onLocationUpdate={setUserLocation}
          savedRegion={mapRegion}
          onRegionChange={setMapRegion}
          isActive={activeTab === "Map"}
          mapType={mapType}
          onMapTypeChange={setMapType}
        />
      </View>
      <View
        style={activeTab === "Family" ? styles.screen : styles.hiddenScreen}
      >
        <FamilyScreen onNavigateToMap={handleNavigateToMap} />
      </View>
      <View
        style={activeTab === "Places" ? styles.screen : styles.hiddenScreen}
      >
        <PlacesScreen />
      </View>
      <View
        style={activeTab === "History" ? styles.screen : styles.hiddenScreen}
      >
        <HistoryScreen />
      </View>
      <View
        style={activeTab === "Settings" ? styles.screen : styles.hiddenScreen}
      >
        <SettingsScreen />
      </View>
      <CustomTabBar activeTab={activeTab} onTabPress={setActiveTab} />
      {/* StatusBar adapts to system theme - light icons for dark mode, dark icons for light mode */}
      <StatusBar style={colors.statusBarStyle} />
    </View>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  screen: {
    flex: 1,
  },
  hiddenScreen: {
    flex: 1,
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0,
    pointerEvents: "none",
  },
});
