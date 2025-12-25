import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from "react-native-maps";
import { StatusBar } from "expo-status-bar";
import { useThemeColors, useIsDarkMode } from "../theme/colors";
import { useAuth } from "../src/contexts/AuthContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface LocationWithUser {
  id: number;
  userId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string | null;
  type: string;
  timestamp: string;
  user: User;
}

interface FamilyLocationHistory {
  [userId: string]: {
    user: User;
    locations: LocationWithUser[];
  };
}

const FAMILY_MEMBER_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#14B8A6",
];

const getUserColor = (userId: number, allUserIds: number[]) => {
  const sortedUserIds = [...allUserIds].sort((a, b) => a - b);
  const index = sortedUserIds.indexOf(userId);
  return FAMILY_MEMBER_COLORS[index % FAMILY_MEMBER_COLORS.length];
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const isDarkMode = useIsDarkMode();
  const { user } = useAuth();

  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: locationHistory = {},
    isLoading,
    error,
    refetch,
  } = useQuery<FamilyLocationHistory>({
    queryKey: ["/api/locations/history"],
    enabled: !!user,
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 2000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const familyMembers = Object.entries(locationHistory);
  const allUserIds = familyMembers.map(([userId]) => parseInt(userId));
  const totalLocations = familyMembers.reduce(
    (sum, [_, data]) => sum + data.locations.length,
    0
  );

  const getColorForUser = useCallback(
    (userId: number) => getUserColor(userId, allUserIds),
    [allUserIds]
  );

  const allLocations = useMemo(() => {
    return familyMembers.flatMap(([userId, data]) =>
      data.locations.map((location) => ({
        ...location,
        userId: parseInt(userId),
        userName: data.user.firstName || data.user.email || "Unknown",
        color: getColorForUser(parseInt(userId)),
      }))
    );
  }, [familyMembers, getColorForUser]);

  const filteredLocations = useMemo(() => {
    if (selectedMember === null) return allLocations;
    return allLocations.filter((loc) => loc.userId === selectedMember);
  }, [allLocations, selectedMember]);

  const mapCenter = useMemo(() => {
    if (filteredLocations.length === 0) {
      return { latitude: 37.7749, longitude: -122.4194 };
    }
    const avgLat =
      filteredLocations.reduce((sum, loc) => sum + loc.latitude, 0) /
      filteredLocations.length;
    const avgLng =
      filteredLocations.reduce((sum, loc) => sum + loc.longitude, 0) /
      filteredLocations.length;
    return { latitude: avgLat, longitude: avgLng };
  }, [filteredLocations]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );
      return diffInMinutes < 1 ? "Just now" : `${diffInMinutes}m ago`;
    }

    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const getLocationAccuracy = (accuracy: number) => {
    if (accuracy <= 10)
      return { label: "High", color: "#10B981", bgColor: "#D1FAE5" };
    if (accuracy <= 50)
      return { label: "Medium", color: "#F59E0B", bgColor: "#FEF3C7" };
    return { label: "Low", color: "#EF4444", bgColor: "#FEE2E2" };
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, backgroundColor: colors.headerBackground },
        ]}
      >
        <StatusBar style={colors.statusBarStyle} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading location history...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, backgroundColor: colors.headerBackground },
        ]}
      >
        <StatusBar style={colors.statusBarStyle} />
        <View style={styles.errorContainer}>
          <Ionicons name="location-outline" size={48} color="#EF4444" />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Unable to load location history
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            Please try refreshing the page
          </Text>
          <TouchableOpacity
            style={[styles.refreshButton, { borderColor: colors.border }]}
            onPress={onRefresh}
            data-testid="button-refresh"
          >
            <Text style={[styles.refreshButtonText, { color: colors.text }]}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.headerBackground },
      ]}
    >
      <StatusBar style={colors.statusBarStyle} />

      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.headerBackground,
            borderBottomColor: colors.headerBorder,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Location History
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Past 24 hours
            </Text>
          </View>
          <View style={styles.viewToggleContainer}>
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                viewMode === "list" && {
                  backgroundColor: colors.primary,
                },
                viewMode !== "list" && {
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
              onPress={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <Ionicons
                name="list"
                size={18}
                color={viewMode === "list" ? "#FFFFFF" : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                viewMode === "map" && {
                  backgroundColor: colors.primary,
                },
                viewMode !== "map" && {
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
              onPress={() => setViewMode("map")}
              data-testid="button-view-map"
            >
              <Ionicons
                name="map"
                size={18}
                color={viewMode === "map" ? "#FFFFFF" : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Text style={[styles.statsText, { color: colors.primary }]}>
            {familyMembers.length} members
          </Text>
          <Text style={[styles.statsDot, { color: colors.textMuted }]}>•</Text>
          <Text style={[styles.statsText, { color: colors.primary }]}>
            {totalLocations} locations
          </Text>
        </View>

        {familyMembers.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.memberFilterScroll}
            contentContainerStyle={styles.memberFilterContent}
          >
            <TouchableOpacity
              style={[
                styles.memberFilterButton,
                selectedMember === null && {
                  backgroundColor: colors.primary,
                },
                selectedMember !== null && {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={() => setSelectedMember(null)}
              data-testid="button-filter-all"
            >
              <Ionicons
                name="people"
                size={14}
                color={selectedMember === null ? "#FFFFFF" : colors.text}
              />
              <Text
                style={[
                  styles.memberFilterText,
                  {
                    color: selectedMember === null ? "#FFFFFF" : colors.text,
                  },
                ]}
              >
                All Members
              </Text>
            </TouchableOpacity>

            {familyMembers.map(([userId, data]) => {
              const userIdNum = parseInt(userId);
              const userColor = getColorForUser(userIdNum);
              const isSelected = selectedMember === userIdNum;

              return (
                <TouchableOpacity
                  key={userId}
                  style={[
                    styles.memberFilterButton,
                    isSelected && { backgroundColor: userColor },
                    !isSelected && {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => setSelectedMember(userIdNum)}
                  data-testid={`button-filter-member-${userId}`}
                >
                  <View
                    style={[
                      styles.memberColorDot,
                      {
                        backgroundColor: isSelected ? "#FFFFFF" : userColor,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.memberFilterText,
                      { color: isSelected ? "#FFFFFF" : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {data.user.firstName || data.user.email}
                  </Text>
                  <View
                    style={[
                      styles.memberCountBadge,
                      {
                        backgroundColor: isSelected
                          ? "rgba(255,255,255,0.3)"
                          : colors.cardBackground,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberCountText,
                        {
                          color: isSelected ? "#FFFFFF" : colors.textSecondary,
                        },
                      ]}
                    >
                      {data.locations.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {totalLocations === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Location History
          </Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            Location history will appear here once family members start sharing
            their locations.
          </Text>
        </View>
      ) : viewMode === "map" ? (
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              ...mapCenter,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation={false}
            showsMyLocationButton={false}
          >
            {filteredLocations.map((location, index) => (
              <Marker
                key={`${location.id}-${index}`}
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title={location.userName}
                description={`${formatTime(location.timestamp)} • ±${location.accuracy.toFixed(0)}m`}
                pinColor={location.color}
              />
            ))}
          </MapView>

          <View
            style={[styles.legendCard, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.legendTitle, { color: colors.text }]}>
              Legend
            </Text>
            <View style={styles.legendItems}>
              {familyMembers.map(([userId, data]) => (
                <View key={userId} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: getColorForUser(parseInt(userId)) },
                    ]}
                  />
                  <Text
                    style={[styles.legendText, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {data.user.firstName || data.user.email} (
                    {data.locations.length})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {familyMembers
            .filter(
              ([userId]) =>
                selectedMember === null || selectedMember === parseInt(userId)
            )
            .map(([userId, data]) => {
              const userIdNum = parseInt(userId);
              const userColor = getColorForUser(userIdNum);

              return (
                <View
                  key={userId}
                  style={[
                    styles.memberCard,
                    { backgroundColor: colors.cardBackground },
                  ]}
                  data-testid={`card-member-${userId}`}
                >
                  <View style={styles.memberCardHeader}>
                    <View style={styles.memberInfo}>
                      <View
                        style={[
                          styles.memberAvatarDot,
                          { backgroundColor: userColor },
                        ]}
                      />
                      <View>
                        <Text
                          style={[styles.memberName, { color: colors.text }]}
                        >
                          {data.user.firstName || data.user.email}
                        </Text>
                        <Text
                          style={[
                            styles.memberLocationCount,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {data.locations.length} locations in the past 24 hours
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.timelineContainer}>
                    {data.locations.length === 0 ? (
                      <Text
                        style={[
                          styles.noLocationsText,
                          { color: colors.textMuted },
                        ]}
                      >
                        No locations recorded in the past 24 hours
                      </Text>
                    ) : (
                      data.locations.slice(0, 10).map((location, index) => {
                        const accuracy = getLocationAccuracy(location.accuracy);
                        return (
                          <View
                            key={location.id}
                            style={styles.timelineItem}
                            data-testid={`timeline-item-${location.id}`}
                          >
                            {index > 0 && (
                              <View
                                style={[
                                  styles.timelineLine,
                                  { backgroundColor: colors.border },
                                ]}
                              />
                            )}
                            <View
                              style={[
                                styles.timelineDot,
                                { backgroundColor: userColor },
                              ]}
                            />
                            <View style={styles.timelineContent}>
                              <View style={styles.timelineHeader}>
                                <View>
                                  <Text
                                    style={[
                                      styles.timelineTime,
                                      { color: colors.text },
                                    ]}
                                  >
                                    {formatTime(location.timestamp)}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.timelineDateTime,
                                      { color: colors.textMuted },
                                    ]}
                                  >
                                    {new Date(
                                      location.timestamp
                                    ).toLocaleString()}
                                  </Text>
                                </View>
                                <View style={styles.timelineBadges}>
                                  <View
                                    style={[
                                      styles.accuracyBadge,
                                      { backgroundColor: accuracy.bgColor },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.accuracyBadgeText,
                                        { color: accuracy.color },
                                      ]}
                                    >
                                      {accuracy.label}
                                    </Text>
                                  </View>
                                  <View
                                    style={[
                                      styles.typeBadge,
                                      { borderColor: colors.border },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.typeBadgeText,
                                        { color: colors.textSecondary },
                                      ]}
                                    >
                                      {location.type}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                              <View style={styles.timelineLocation}>
                                <Text
                                  style={[
                                    styles.timelineAddress,
                                    { color: colors.textSecondary },
                                  ]}
                                  numberOfLines={2}
                                >
                                  📍{" "}
                                  {location.address ||
                                    `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
                                </Text>
                                <Text
                                  style={[
                                    styles.timelineAccuracy,
                                    { color: colors.textMuted },
                                  ]}
                                >
                                  ±{location.accuracy.toFixed(0)}m
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                    {data.locations.length > 10 && (
                      <Text
                        style={[
                          styles.moreLocations,
                          { color: colors.primary },
                        ]}
                      >
                        +{data.locations.length - 10} more locations
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  refreshButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  viewToggleContainer: {
    flexDirection: "row",
    gap: 8,
  },
  viewToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  statsText: {
    fontSize: 14,
    fontWeight: "600",
  },
  statsDot: {
    marginHorizontal: 8,
  },
  memberFilterScroll: {
    marginTop: 12,
  },
  memberFilterContent: {
    gap: 8,
  },
  memberFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  memberColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  memberFilterText: {
    fontSize: 14,
    fontWeight: "500",
    maxWidth: 100,
  },
  memberCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  memberCountText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  legendCard: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  legendText: {
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  memberCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  memberCardHeader: {
    marginBottom: 16,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  memberAvatarDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
  },
  memberLocationCount: {
    fontSize: 13,
    marginTop: 2,
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  noLocationsText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 16,
    position: "relative",
  },
  timelineLine: {
    position: "absolute",
    left: 3,
    top: -20,
    width: 2,
    height: 24,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
  },
  timelineTime: {
    fontSize: 14,
    fontWeight: "600",
  },
  timelineDateTime: {
    fontSize: 11,
    marginTop: 2,
  },
  timelineBadges: {
    flexDirection: "row",
    gap: 6,
  },
  accuracyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  accuracyBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
  },
  timelineLocation: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  timelineAddress: {
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  timelineAccuracy: {
    fontSize: 11,
  },
  moreLocations: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
    marginLeft: 20,
  },
});
