import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabName = "Map" | "Family" | "Places" | "History" | "Settings";

interface CustomTabBarProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
}

const tabs: {
  name: TabName;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}[] = [
  { name: "Map", icon: "map-outline", label: "Map" },
  { name: "Family", icon: "people-outline", label: "Family" },
  { name: "Places", icon: "bookmark-outline", label: "Places" },
  { name: "History", icon: "time-outline", label: "History" },
  { name: "Settings", icon: "settings-outline", label: "Settings" },
];

export default function CustomTabBar({
  activeTab,
  onTabPress,
}: CustomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => onTabPress(tab.name)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={24}
              color={isActive ? "#1d89f1" : "#8E8E93"}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    color: "#8E8E93",
    fontWeight: "500",
  },
  activeLabel: {
    color: "#1d89f1",
  },
});
