import { useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
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

type TabName = "Map" | "Family" | "Places" | "History" | "Settings";

function AppContent() {
  const { user, isLoading } = useAuth();
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

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
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
  const renderScreen = () => {
    switch (activeTab) {
      case "Map":
        return (
          <MapScreen
            focusLocation={focusLocation}
            onLocationFocused={() => setFocusLocation(null)}
            userLocation={userLocation}
            onLocationUpdate={setUserLocation}
          />
        );
      case "Family":
        return <FamilyScreen onNavigateToMap={handleNavigateToMap} />;
      case "Places":
        return <PlacesScreen />;
      case "History":
        return <HistoryScreen />;
      case "Settings":
        return <SettingsScreen />;
      default:
        return <MapScreen />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
      <CustomTabBar activeTab={activeTab} onTabPress={setActiveTab} />
      <StatusBar style="auto" />
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
});
