import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../src/contexts/AuthContext";
import { User } from "../../shared/schema";
import NotificationBell from "../components/NotificationBell";
import Compass from "../components/Compass";
import AlertDialog from "../components/AlertDialog";

// Type definitions
interface FamilyLocation {
  id: number;
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
  isRecent: boolean;
}

interface Place {
  id: number;
  latitude: number;
  longitude: number;
  name: string;
  category?: string;
  address?: string;
  color?: string;
}

// Custom marker components for different types
const UserMarker = ({
  latitude,
  longitude,
  name,
  onPress,
}: {
  latitude: number;
  longitude: number;
  name: string;
  onPress?: () => void;
}) => (
  <Marker
    coordinate={{ latitude, longitude }}
    onPress={onPress}
    pinColor="#1d89f1"
  >
    <View style={styles.userMarkerContainer}>
      <View style={styles.userMarker} />
      <View style={styles.userMarkerPulse} />
    </View>
    <Callout>
      <View style={styles.callout}>
        <Text style={styles.calloutTitle}>{name}</Text>
        <Text style={styles.calloutDescription}>Current location</Text>
      </View>
    </Callout>
  </Marker>
);

const FamilyMarker = ({
  latitude,
  longitude,
  name,
  address,
  isRecent,
  onPress,
}: {
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
  isRecent: boolean;
  onPress?: () => void;
}) => (
  <Marker
    coordinate={{ latitude, longitude }}
    onPress={onPress}
    pinColor="#34C759"
  >
    <View style={styles.familyMarkerContainer}>
      <View
        style={[styles.familyMarker, !isRecent && styles.familyMarkerOld]}
      />
      {isRecent && <View style={styles.familyMarkerPulse} />}
    </View>
    <Callout>
      <View style={styles.callout}>
        <Text style={styles.calloutTitle}>{name}</Text>
        <Text style={styles.calloutDescription}>
          {address || "Unknown location"}
        </Text>
        <Text style={styles.calloutTime}>
          {isRecent ? "Active now" : "Last seen recently"}
        </Text>
      </View>
    </Callout>
  </Marker>
);

const PlaceMarker = ({
  latitude,
  longitude,
  name,
  category,
  address,
  color,
  onPress,
}: {
  latitude: number;
  longitude: number;
  name: string;
  category?: string;
  address?: string;
  color?: string;
  onPress?: () => void;
}) => {
  const categoryColors: Record<string, string> = {
    home: "#9333EA",
    work: "#F97316",
    school: "#EAB308",
    other: "#6B7280",
  };

  const markerColor = color || categoryColors[category || "other"] || "#6B7280";

  return (
    <Marker coordinate={{ latitude, longitude }} onPress={onPress}>
      <View style={[styles.placeMarker, { backgroundColor: markerColor }]}>
        <View style={styles.placeMarkerDot} />
      </View>
      <Callout>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{name}</Text>
          <Text style={styles.calloutDescription}>
            {category
              ? `${category.charAt(0).toUpperCase() + category.slice(1)} • `
              : ""}
            Saved Place
          </Text>
          {address && <Text style={styles.calloutTime}>{address}</Text>}
        </View>
      </Callout>
    </Marker>
  );
};

interface MapScreenProps {
  focusLocation?: {
    latitude: number;
    longitude: number;
    userId: number;
  } | null;
  onLocationFocused?: () => void;
  userLocation?: { latitude: number; longitude: number } | null;
  onLocationUpdate?: (location: {
    latitude: number;
    longitude: number;
  }) => void;
  savedRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null;
  onRegionChange?: (region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => void;
  isActive?: boolean;
  mapType?: "standard" | "hybrid";
  onMapTypeChange?: (mapType: "standard" | "hybrid") => void;
}

export default function MapScreen({
  focusLocation,
  onLocationFocused,
  userLocation: userLocationProp,
  onLocationUpdate,
  savedRegion,
  onRegionChange,
  isActive = true,
  mapType: mapTypeProp,
  onMapTypeChange,
}: MapScreenProps) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const hasInitializedLocation = useRef(false);
  const [localMapType, setLocalMapType] = useState<"standard" | "hybrid">(
    "standard"
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [mapHeading, setMapHeading] = useState(0); // Track map rotation
  const { user } = useAuth();

  // Alert dialog state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
  }>({ visible: false });

  // Fetch family locations for the map
  const { data: familyLocationsData = [] } = useQuery<
    Array<{
      user: User;
      latitude: number;
      longitude: number;
      timestamp: Date | null;
    }>
  >({
    queryKey: ["/api/locations/family"],
    enabled: !!user && isActive,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Use prop mapType if provided, otherwise use local state
  const mapType = mapTypeProp !== undefined ? mapTypeProp : localMapType;
  const setMapType = (type: "standard" | "hybrid") => {
    if (onMapTypeChange) {
      onMapTypeChange(type);
    } else {
      setLocalMapType(type);
    }
  };

  // Use prop location if provided, otherwise use local state
  const currentLocation = userLocationProp;

  // Use saved region if available, otherwise use default
  const initialRegion = savedRegion || {
    latitude: 40.7128,
    longitude: -74.006,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  // Convert API data to FamilyLocation format for markers
  const familyLocations: FamilyLocation[] = familyLocationsData
    .filter((loc) => {
      // Only show markers for users with location sharing enabled
      return loc.user.locationSharingEnabled;
    })
    .map((loc) => {
      const now = new Date();
      const timestamp = loc.timestamp ? new Date(loc.timestamp) : new Date(0);
      const minutesAgo = Math.floor(
        (now.getTime() - timestamp.getTime()) / (1000 * 60)
      );
      const isRecent = minutesAgo < 15; // Active within 15 minutes

      return {
        id: loc.user.id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        name: loc.user.firstName || loc.user.email,
        address: `Last seen ${minutesAgo < 1 ? "just now" : `${minutesAgo} min ago`}`,
        isRecent,
      };
    });

  // Count only truly "online" members (< 5 minutes, location sharing enabled)
  const onlineMembersCount = familyLocationsData.filter((loc) => {
    if (!loc.user.locationSharingEnabled || !loc.timestamp) return false;
    const now = new Date();
    const timestamp = new Date(loc.timestamp);
    const minutesAgo = Math.floor(
      (now.getTime() - timestamp.getTime()) / (1000 * 60)
    );
    return minutesAgo < 5; // Only count as online if active within last 5 minutes
  }).length;

  const places: Place[] = [
    // { id: 1, latitude: 40.7589, longitude: -73.9851, name: 'Home', category: 'home', address: '123 Main St' },
  ];

  // Get location only if we don't have a saved region and no current location
  useEffect(() => {
    if (!hasInitializedLocation.current && !currentLocation && !savedRegion) {
      getCurrentLocation();
      hasInitializedLocation.current = true;
    }
  }, []);

  // Only recenter when focusLocation changes (navigation from Family screen)
  useEffect(() => {
    if (focusLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: focusLocation.latitude,
          longitude: focusLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
      onLocationFocused?.();
    }
  }, [focusLocation]);

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setIsLoadingLocation(false);
        setAlertConfig({
          visible: true,
          title: "Permission Required",
          message:
            "Please enable location permissions to see yourself on the map.",
          icon: "location",
          iconColor: "#FF3B30",
        });
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Update location via prop callback to persist across tab switches
      if (onLocationUpdate) {
        onLocationUpdate({ latitude, longitude });
      }

      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setIsLoadingLocation(false);

      // Center map on user location
      mapRef.current?.animateToRegion(newRegion, 1000);

      // Save region to parent after animation starts
      onRegionChange?.(newRegion);
    } catch (error) {
      console.error("Location error:", error);
      setIsLoadingLocation(false);
      setAlertConfig({
        visible: true,
        title: "Location Error",
        message:
          "Unable to get your location. Please check your device settings.",
        icon: "alert-circle",
        iconColor: "#FF3B30",
      });
    }
  };

  const centerOnUser = () => {
    if (currentLocation) {
      mapRef.current?.animateToRegion(
        {
          ...currentLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    } else {
      getCurrentLocation();
    }
  };

  const zoomIn = () => {
    mapRef.current?.getCamera().then((camera) => {
      if (camera.zoom !== undefined) {
        mapRef.current?.animateCamera(
          { zoom: camera.zoom + 1 },
          { duration: 300 }
        );
      }
    });
  };

  const zoomOut = () => {
    mapRef.current?.getCamera().then((camera) => {
      if (camera.zoom !== undefined) {
        mapRef.current?.animateCamera(
          { zoom: camera.zoom - 1 },
          { duration: 300 }
        );
      }
    });
  };

  const resetNorth = () => {
    mapRef.current?.animateCamera({ heading: 0 }, { duration: 300 });
  };

  const toggleMapType = () => {
    setMapType(mapType === "standard" ? "hybrid" : "standard");
  };

  return (
    <View style={styles.container}>
      {/* Status Bar - white icons in satellite/hybrid mode */}
      <StatusBar style={mapType === "standard" ? "dark" : "light"} />
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        initialRegion={initialRegion}
        onRegionChange={(region) => {
          // Update compass heading in real-time while rotating
          mapRef.current?.getCamera().then((camera) => {
            setMapHeading(camera.heading || 0);
          });
        }}
        onRegionChangeComplete={(region) => {
          // Only save region when Map tab is active to prevent saving incorrect positions
          if (isActive) {
            onRegionChange?.(region);
          }
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsPointsOfInterest={true}
        showsBuildings={true}
        toolbarEnabled={false}
      >
        {/* Current User Marker */}
        {currentLocation && (
          <UserMarker
            latitude={currentLocation.latitude}
            longitude={currentLocation.longitude}
            name="You"
          />
        )}

        {/* Family Member Markers */}
        {familyLocations.map((location) => (
          <FamilyMarker
            key={location.id}
            latitude={location.latitude}
            longitude={location.longitude}
            name={location.name}
            address={location.address}
            isRecent={location.isRecent}
          />
        ))}

        {/* Saved Places Markers */}
        {places.map((place) => (
          <PlaceMarker
            key={place.id}
            latitude={place.latitude}
            longitude={place.longitude}
            name={place.name}
            category={place.category}
            address={place.address}
          />
        ))}
      </MapView>

      {/* Notification Bell - Top Right */}
      <View style={[styles.notificationBell, { top: insets.top + 16 }]}>
        <NotificationBell />
      </View>

      {/* Compass Button - Bottom Left */}
      <View style={[styles.compassButton, { bottom: 72, left: 16 }]}>
        <Compass heading={mapHeading} onPress={resetNorth} />
      </View>

      {/* Members Indicator - Top Center */}
      <View style={[styles.membersIndicator, { top: insets.top + 16 }]}>
        <BlurView intensity={100} style={styles.membersIndicatorBlur}>
          <View style={styles.membersIndicatorContent}>
            <View style={styles.statusDot} />
            <Text style={styles.membersText}>
              {onlineMembersCount} member
              {onlineMembersCount !== 1 ? "s" : ""} online
            </Text>
          </View>
        </BlurView>
      </View>

      {/* Location Not Available Banner */}
      {!currentLocation && !isLoadingLocation && (
        <View style={[styles.banner, { top: insets.top + 16 }]}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Location not detected</Text>
              <Text style={styles.bannerDescription}>
                Enable location to see yourself on the map
              </Text>
            </View>
            <TouchableOpacity
              onPress={getCurrentLocation}
              style={styles.bannerButton}
              activeOpacity={0.7}
            >
              <Text style={styles.bannerButtonText}>Get Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Loading Indicator */}
      {isLoadingLocation && (
        <View style={[styles.loadingContainer, { top: insets.top + 16 }]}>
          <ActivityIndicator size="large" color="#1d89f1" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      )}

      {/* Map Controls - positioned for equal spacing */}
      <View
        style={{
          position: "absolute",
          right: 16,
          bottom: 72,
          gap: 8,
        }}
      >
        {/* Map Type Toggle */}
        <TouchableOpacity
          onPress={toggleMapType}
          style={styles.controlButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name={mapType === "standard" ? "earth-outline" : "map-outline"}
            size={24}
            color="#333"
          />
        </TouchableOpacity>

        {/* Zoom In */}
        <TouchableOpacity
          onPress={zoomIn}
          style={styles.controlButton}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#333" />
        </TouchableOpacity>

        {/* Zoom Out */}
        <TouchableOpacity
          onPress={zoomOut}
          style={styles.controlButton}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={24} color="#333" />
        </TouchableOpacity>

        {/* Center on User */}
        <TouchableOpacity
          onPress={centerOnUser}
          style={[
            styles.controlButton,
            styles.centerButton,
            !currentLocation && styles.centerButtonDisabled,
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="navigate" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Custom Alert Dialog */}
      <AlertDialog
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        buttons={[{ text: "OK" }]}
        onDismiss={() => setAlertConfig({ visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },

  // Custom Marker Styles
  userMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
  },
  userMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#1d89f1",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  userMarkerPulse: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#1d89f1",
    opacity: 0.3,
  },

  familyMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
  },
  familyMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#34C759",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  familyMarkerOld: {
    opacity: 0.6,
  },
  familyMarkerPulse: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#34C759",
    opacity: 0.3,
  },

  placeMarker: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  placeMarkerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },

  // Callout Styles
  callout: {
    padding: 8,
    minWidth: 120,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  calloutDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  calloutTime: {
    fontSize: 10,
    color: "#999",
  },

  // Notification Bell Styles
  notificationBell: {
    position: "absolute",
    right: 16,
    zIndex: 40,
  },

  // Compass Button Styles
  compassButton: {
    position: "absolute",
    zIndex: 40,
  },

  // Members Indicator Styles
  membersIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 30,
  },
  membersIndicatorBlur: {
    borderRadius: 999,
    overflow: "hidden",
  },
  membersIndicatorContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  membersText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },

  // Banner Styles
  banner: {
    position: "absolute",
    left: 16,
    right: 80,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#007AFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  bannerDescription: {
    fontSize: 12,
    color: "#666",
  },
  bannerButton: {
    backgroundColor: "#1d89f1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bannerButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  // Loading Styles
  loadingContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },

  // Control Buttons
  controls: {
    position: "absolute",
    right: 16,
    gap: 8,
  },
  controlButton: {
    width: 56,
    height: 56,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  centerButton: {
    backgroundColor: "#1d89f1",
    borderWidth: 0,
  },
  centerButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
});
