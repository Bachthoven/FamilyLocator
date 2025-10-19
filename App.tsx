import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import CustomTabBar from "./mobile/components/CustomTabBar";
import MapScreen from "./mobile/screens/MapScreen";
import FamilyScreen from "./mobile/screens/FamilyScreen";
import PlacesScreen from "./mobile/screens/PlacesScreen";
import HistoryScreen from "./mobile/screens/HistoryScreen";
import SettingsScreen from "./mobile/screens/SettingsScreen";

type TabName = "Map" | "Family" | "Places" | "History" | "Settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>("Map");

  const renderScreen = () => {
    switch (activeTab) {
      case "Map":
        return <MapScreen />;
      case "Family":
        return <FamilyScreen />;
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
    <SafeAreaProvider>
      <View style={styles.container}>
        {renderScreen()}
        <CustomTabBar activeTab={activeTab} onTabPress={setActiveTab} />
        <StatusBar style="auto" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
