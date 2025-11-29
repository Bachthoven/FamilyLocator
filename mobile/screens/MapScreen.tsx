import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../src/contexts/AuthContext";
import { User } from "../../shared/schema";
import NotificationBell from "../components/NotificationBell";
import Compass from "../components/Compass";
import AlertDialog from "../components/AlertDialog";
import { useThemeColors } from "../theme/colors";

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

interface DragState {
  placeId: number;
  originalCoordinate: { latitude: number; longitude: number };
  currentCoordinate: { latitude: number; longitude: number };
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
    anchor={{ x: 0.5, y: 1 }}
  >
    <View style={styles.userMarkerContainer}>
      <View style={styles.userMarker} />
      <View style={styles.userMarkerPulse} />
    </View>
  </Marker>
);

const FamilyMarker = ({
  latitude,
  longitude,
  name,
  address,
  isRecent,
  statusColor,
  statusMessage,
  onPress,
}: {
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
  isRecent: boolean;
  statusColor: string;
  statusMessage: string;
  onPress?: () => void;
}) => (
  <Marker
    coordinate={{ latitude, longitude }}
    onPress={onPress}
    anchor={{ x: 0.5, y: 1 }}
  >
    <View style={styles.familyMarkerContainer}>
      <View
        style={[styles.familyMarker, !isRecent && styles.familyMarkerOld]}
      />
      {isRecent && <View style={styles.familyMarkerPulse} />}
    </View>
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
    <Marker
      coordinate={{ latitude, longitude }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={true}
    >
      <View style={[styles.placeMarker, { backgroundColor: markerColor }]}>
        <View style={styles.placeMarkerDot} />
      </View>
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
  const colors = useThemeColors();
  const mapRef = useRef<MapView>(null);
  const hasInitializedLocation = useRef(false);
  const isProgrammaticMove = useRef(false); // Track if we're centering programmatically
  const [localMapType, setLocalMapType] = useState<"standard" | "hybrid">(
    "standard"
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [mapHeading, setMapHeading] = useState(0); // Track map rotation
  const [currentRegion, setCurrentRegion] = useState(
    savedRegion || {
      latitude: 40.7128,
      longitude: -74.006,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    }
  );
  const { user } = useAuth();

  // Alert dialog state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
  }>({ visible: false });

  // Selected marker state for slide-down dialog
  const [selectedMarker, setSelectedMarker] = useState<{
    type: "user" | "family" | "place";
    id?: number;
    name: string;
    statusMessage?: string;
    address?: string;
    category?: string;
    coordinate: { latitude: number; longitude: number };
  } | null>(null);

  // Drag mode state for place markers
  const [dragState, setDragState] = useState<DragState | null>(null);
  const queryClient = useQueryClient();

  // Animation for slide-down dialog
  const slideAnim = useRef(new Animated.Value(-200)).current;

  // Animate dialog when marker is selected/deselected
  useEffect(() => {
    if (selectedMarker) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedMarker]);

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

  // Helper function to format time ago
  const formatTimeAgo = (minutesAgo: number) => {
    if (minutesAgo < 1) {
      return "just now";
    } else if (minutesAgo < 60) {
      return `${minutesAgo} min ago`;
    } else if (minutesAgo < 1440) {
      const hours = Math.floor(minutesAgo / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(minutesAgo / 1440);
      return `${days}d ago`;
    }
  };

  // Helper function to get status info
  const getStatusInfo = (minutesAgo: number) => {
    if (minutesAgo < 5) {
      return {
        color: "#10B981",
        message: "Currently active",
      };
    } else if (minutesAgo < 15) {
      return {
        color: "#F59E0B",
        message: `${minutesAgo} min ago`,
      };
    } else if (minutesAgo < 60) {
      return {
        color: "#F97316",
        message: `Inactive for ${minutesAgo} min`,
      };
    } else if (minutesAgo < 1440) {
      const hours = Math.floor(minutesAgo / 60);
      return {
        color: "#EF4444",
        message: `Offline for ${hours}h`,
      };
    } else {
      const days = Math.floor(minutesAgo / 1440);
      return {
        color: "#6B7280",
        message: `Offline for ${days}d`,
      };
    }
  };

  // Convert API data to FamilyLocation format for markers
  const familyLocations: (FamilyLocation & {
    statusColor: string;
    statusMessage: string;
  })[] = familyLocationsData
    .filter((loc) => {
      // Only show markers for users with location sharing enabled
      return loc.user.locationSharingEnabled && loc.timestamp;
    })
    .map((loc) => {
      const now = new Date();
      const timestamp = loc.timestamp ? new Date(loc.timestamp) : new Date(0);
      const minutesAgo = Math.floor(
        (now.getTime() - timestamp.getTime()) / (1000 * 60)
      );
      const isRecent = minutesAgo < 15; // Green pulse for active within 15 minutes
      const statusInfo = getStatusInfo(minutesAgo);
      const fullName =
        loc.user.firstName && loc.user.lastName
          ? `${loc.user.firstName} ${loc.user.lastName}`
          : loc.user.firstName || loc.user.email;

      return {
        id: loc.user.id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        name: fullName,
        address: `Last seen ${formatTimeAgo(minutesAgo)}`,
        isRecent,
        statusColor: statusInfo.color,
        statusMessage: statusInfo.message,
      };
    });

  // Count online members: logged-in user is always online + family members active within 5 minutes
  const familyMembersOnline = familyLocationsData.filter((loc) => {
    if (!loc.user.locationSharingEnabled || !loc.timestamp) return false;
    const now = new Date();
    const timestamp = new Date(loc.timestamp);
    const minutesAgo = Math.floor(
      (now.getTime() - timestamp.getTime()) / (1000 * 60)
    );
    return minutesAgo < 5; // Only count as online if active within last 5 minutes
  }).length;

  // Always include the logged-in user as online (viewing the app = online)
  const onlineMembersCount = familyMembersOnline + 1;

  // Fetch saved places from API
  const { data: placesData = [] } = useQuery<Place[]>({
    queryKey: ["/api/places"],
    enabled: !!user && isActive,
  });

  const places: Place[] = placesData;

  // Mutation for updating place location
  const updatePlaceMutation = useMutation({
    mutationFn: async ({
      id,
      latitude,
      longitude,
    }: {
      id: number;
      latitude: number;
      longitude: number;
    }) => {
      const response = await fetch(`/api/places/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude }),
      });
      if (!response.ok) throw new Error("Failed to update place location");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/places"] });
      setDragState(null);
      isProgrammaticMove.current = false;
      setSelectedMarker(null);
      setAlertConfig({
        visible: true,
        title: "Location Updated",
        message: "The place location has been saved.",
        icon: "checkmark-circle",
        iconColor: "#10B981",
      });
    },
    onError: () => {
      setAlertConfig({
        visible: true,
        title: "Update Failed",
        message: "Could not save the new location. Please try again.",
        icon: "alert-circle",
        iconColor: "#EF4444",
      });
    },
  });

  // Track which proximity alerts have been sent to avoid duplicates
  const sentProximityAlerts = useRef<Set<string>>(new Set());

  // Calculate distance between two coordinates in meters using Haversine formula
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3; // Earth's radius in meters
      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
      const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) *
          Math.cos(phi2) *
          Math.sin(deltaLambda / 2) *
          Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    },
    []
  );

  // State for proximity alert (in-app notification)
  const [proximityAlert, setProximityAlert] = useState<{
    visible: boolean;
    memberName: string;
    placeName: string;
  }>({ visible: false, memberName: "", placeName: "" });

  // Helper function to show proximity alert (in-app only, Native Notify will handle push)
  const showProximityAlert = useCallback(
    (memberName: string, placeName: string) => {
      setProximityAlert({
        visible: true,
        memberName,
        placeName,
      });
      setTimeout(() => {
        setProximityAlert((prev) => ({ ...prev, visible: false }));
      }, 4000);
    },
    []
  );

  // Check proximity and send notifications
  useEffect(() => {
    if (!familyLocationsData.length || !places.length) return;

    const PROXIMITY_RADIUS = 20; // 20 meters

    familyLocationsData.forEach((familyLoc) => {
      if (!familyLoc.user.locationSharingEnabled || !familyLoc.timestamp)
        return;

      const memberName =
        familyLoc.user.firstName && familyLoc.user.lastName
          ? `${familyLoc.user.firstName} ${familyLoc.user.lastName}`
          : familyLoc.user.firstName || familyLoc.user.email;

      places.forEach((place) => {
        const distance = calculateDistance(
          familyLoc.latitude,
          familyLoc.longitude,
          place.latitude,
          place.longitude
        );

        const alertKey = `${familyLoc.user.id}-${place.id}`;
        const wasNearby = sentProximityAlerts.current.has(alertKey);

        if (distance <= PROXIMITY_RADIUS) {
          // Member is within 20m of place
          if (!wasNearby) {
            // Show in-app alert only if we haven't already
            sentProximityAlerts.current.add(alertKey);
            showProximityAlert(memberName, place.name);
          }
        } else if (distance > PROXIMITY_RADIUS + 10) {
          // Member has moved away (with 10m buffer to prevent flapping)
          if (wasNearby) {
            sentProximityAlerts.current.delete(alertKey);
          }
        }
      });
    });
  }, [familyLocationsData, places, calculateDistance, showProximityAlert]);

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
      {/* Status Bar - dynamic based on theme */}
      <StatusBar style={colors.statusBarStyle} />
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
          // Close slide-down dialog when user manually pans/zooms (not programmatic)
          // But not while in reposition mode
          if (selectedMarker && !isProgrammaticMove.current && !dragState) {
            setSelectedMarker(null);
          }
        }}
        onRegionChangeComplete={(region) => {
          // Track current region for zoom level
          setCurrentRegion(region);
          // Reset programmatic move flag
          isProgrammaticMove.current = false;
          // Only save region when Map tab is active to prevent saving incorrect positions
          if (isActive) {
            onRegionChange?.(region);
          }
          // Update drag state with map center position
          if (dragState) {
            setDragState((prev) =>
              prev
                ? {
                    ...prev,
                    currentCoordinate: {
                      latitude: region.latitude,
                      longitude: region.longitude,
                    },
                  }
                : null
            );
          }
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsPointsOfInterest={true}
        showsBuildings={true}
        toolbarEnabled={false}
        moveOnMarkerPress={!dragState}
      >
        {/* Current User Marker */}
        {currentLocation && (
          <UserMarker
            latitude={currentLocation.latitude}
            longitude={currentLocation.longitude}
            name="You"
            onPress={() => {
              // Mark as programmatic move
              isProgrammaticMove.current = true;
              // Center map on marker while maintaining current zoom
              mapRef.current?.animateToRegion(
                {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: currentRegion.latitudeDelta,
                  longitudeDelta: currentRegion.longitudeDelta,
                },
                300
              );
              // Show slide-down dialog
              setSelectedMarker({
                type: "user",
                name: "You",
                statusMessage: "Current location",
                coordinate: {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                },
              });
            }}
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
            statusColor={location.statusColor}
            statusMessage={location.statusMessage}
            onPress={() => {
              // Mark as programmatic move
              isProgrammaticMove.current = true;
              // Center map on marker while maintaining current zoom
              mapRef.current?.animateToRegion(
                {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: currentRegion.latitudeDelta,
                  longitudeDelta: currentRegion.longitudeDelta,
                },
                300
              );
              // Show slide-down dialog
              setSelectedMarker({
                type: "family",
                name: location.name,
                statusMessage: location.statusMessage,
                address: location.address,
                coordinate: {
                  latitude: location.latitude,
                  longitude: location.longitude,
                },
              });
            }}
          />
        ))}

        {/* Saved Places Markers - hide the one being repositioned */}
        {places
          .filter((place) => dragState?.placeId !== place.id)
          .map((place) => (
            <PlaceMarker
              key={place.id}
              latitude={place.latitude}
              longitude={place.longitude}
              name={place.name}
              category={place.category}
              address={place.address}
              onPress={() => {
                if (dragState) return;
                isProgrammaticMove.current = true;
                mapRef.current?.animateToRegion(
                  {
                    latitude: place.latitude,
                    longitude: place.longitude,
                    latitudeDelta: currentRegion.latitudeDelta,
                    longitudeDelta: currentRegion.longitudeDelta,
                  },
                  300
                );
                setSelectedMarker({
                  type: "place",
                  id: place.id,
                  name: place.name,
                  statusMessage: place.category
                    ? `${place.category.charAt(0).toUpperCase() + place.category.slice(1)} • Saved Place`
                    : "Saved Place",
                  address: place.address,
                  category: place.category,
                  coordinate: {
                    latitude: place.latitude,
                    longitude: place.longitude,
                  },
                });
              }}
            />
          ))}
      </MapView>

      {/* Center marker for repositioning mode */}
      {dragState && (
        <View style={styles.repositionMarkerContainer} pointerEvents="box-none">
          <View style={styles.repositionMarker}>
            <View style={styles.repositionMarkerDot} />
          </View>
        </View>
      )}

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
          <ActivityIndicator size="large" color="#0EA5E9" />
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
          style={[
            styles.controlButton,
            {
              backgroundColor: colors.controlButtonBackground,
              borderColor: colors.controlButtonBorder,
            },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={mapType === "standard" ? "earth-outline" : "map-outline"}
            size={24}
            color={colors.controlButtonIcon}
          />
        </TouchableOpacity>

        {/* Zoom In */}
        <TouchableOpacity
          onPress={zoomIn}
          style={[
            styles.controlButton,
            {
              backgroundColor: colors.controlButtonBackground,
              borderColor: colors.controlButtonBorder,
            },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color={colors.controlButtonIcon} />
        </TouchableOpacity>

        {/* Zoom Out */}
        <TouchableOpacity
          onPress={zoomOut}
          style={[
            styles.controlButton,
            {
              backgroundColor: colors.controlButtonBackground,
              borderColor: colors.controlButtonBorder,
            },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={24} color={colors.controlButtonIcon} />
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

      {/* Slide-Down Dialog from Top */}
      <Animated.View
        style={[
          styles.slideDownContainer,
          {
            transform: [{ translateY: slideAnim }],
            top: insets.top,
          },
        ]}
        pointerEvents={selectedMarker ? "auto" : "none"}
      >
        {selectedMarker && (
          <View
            style={[
              styles.slideDownDialog,
              {
                backgroundColor: colors.dialogBackground,
                borderColor: colors.dialogBorder,
              },
            ]}
          >
            <View style={styles.slideDownHeader}>
              <View style={styles.slideDownIconContainer}>
                <Ionicons
                  name={
                    selectedMarker.type === "user"
                      ? "person"
                      : selectedMarker.type === "family"
                        ? "people"
                        : "location"
                  }
                  size={20}
                  color="#fff"
                />
              </View>
              <Text
                style={[styles.slideDownName, { color: colors.dialogText }]}
              >
                {selectedMarker.name}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedMarker(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.slideDownCloseButton}
              >
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={colors.dialogTextMuted}
                />
              </TouchableOpacity>
            </View>
            {selectedMarker.statusMessage && (
              <View style={styles.slideDownStatusRow}>
                <View
                  style={[
                    styles.slideDownStatusDot,
                    {
                      backgroundColor:
                        selectedMarker.type === "user" ? "#10B981" : "#10B981",
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.slideDownStatus,
                    { color: colors.dialogTextSecondary },
                  ]}
                >
                  {selectedMarker.statusMessage}
                </Text>
              </View>
            )}
            {selectedMarker.address && (
              <View style={styles.slideDownAddressRow}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={colors.dialogTextMuted}
                />
                <Text
                  style={[
                    styles.slideDownAddress,
                    { color: colors.dialogTextMuted },
                  ]}
                >
                  {selectedMarker.address}
                </Text>
              </View>
            )}
            {selectedMarker.type === "place" && selectedMarker.id && (
              <TouchableOpacity
                style={styles.enableDragButton}
                onPress={() => {
                  isProgrammaticMove.current = true;
                  mapRef.current?.animateToRegion(
                    {
                      latitude: selectedMarker.coordinate.latitude,
                      longitude: selectedMarker.coordinate.longitude,
                      latitudeDelta: currentRegion.latitudeDelta,
                      longitudeDelta: currentRegion.longitudeDelta,
                    },
                    300
                  );
                  setDragState({
                    placeId: selectedMarker.id!,
                    originalCoordinate: selectedMarker.coordinate,
                    currentCoordinate: selectedMarker.coordinate,
                  });
                  setSelectedMarker(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="locate" size={18} color="#fff" />
                <Text style={styles.enableDragButtonText}>
                  Reposition Place
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>

      {/* Drag Mode Control Panel */}
      {dragState && (
        <View style={[styles.dragModePanel, { bottom: 88 }]}>
          <BlurView intensity={100} style={styles.dragModePanelBlur}>
            <View style={styles.dragModePanelContent}>
              <View style={styles.dragModeInfo}>
                <View style={styles.dragModeIconContainer}>
                  <Ionicons name="locate" size={20} color="#fff" />
                </View>
                <View style={styles.dragModeTextContainer}>
                  <Text style={styles.dragModeTitle}>Reposition Mode</Text>
                  <Text style={styles.dragModeSubtitle}>
                    Pan the map to move the crosshair
                  </Text>
                </View>
              </View>
              <View style={styles.dragModeButtons}>
                <TouchableOpacity
                  style={styles.dragModeCancelButton}
                  onPress={() => {
                    setDragState(null);
                    isProgrammaticMove.current = false;
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dragModeCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dragModeSaveButton,
                    updatePlaceMutation.isPending &&
                      styles.dragModeSaveButtonDisabled,
                  ]}
                  onPress={() => {
                    if (dragState) {
                      updatePlaceMutation.mutate({
                        id: dragState.placeId,
                        latitude: dragState.currentCoordinate.latitude,
                        longitude: dragState.currentCoordinate.longitude,
                      });
                    }
                  }}
                  disabled={updatePlaceMutation.isPending}
                  activeOpacity={0.7}
                >
                  {updatePlaceMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.dragModeSaveText}>Save Location</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      )}

      {/* Proximity Alert Banner (for Expo Go) */}
      {proximityAlert.visible && (
        <View style={[styles.proximityAlertBanner, { top: insets.top + 60 }]}>
          <BlurView intensity={100} style={styles.proximityAlertBlur}>
            <View style={styles.proximityAlertContent}>
              <View style={styles.proximityAlertIcon}>
                <Ionicons name="location" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.proximityAlertText}>
                <Text style={styles.proximityAlertTitle}>
                  📍 {proximityAlert.memberName} arrived
                </Text>
                <Text style={styles.proximityAlertBody}>
                  Now at {proximityAlert.placeName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  setProximityAlert((prev) => ({ ...prev, visible: false }))
                }
                style={styles.proximityAlertClose}
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      )}

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
    backgroundColor: "#0EA5E9",
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
    backgroundColor: "#0EA5E9",
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
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  familyMarkerOld: {
    opacity: 0.3,
  },
  familyMarkerPulse: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10B981",
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

  // Reposition marker for repositioning mode (center of screen)
  repositionMarkerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  repositionMarker: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: "#0EA5E9",
    backgroundColor: "#6B7280",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  repositionMarkerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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

  // Custom Callout Styles (Speech Bubble)
  customCallout: {
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 200,
  },
  customCalloutContent: {
    padding: 12,
    minWidth: 200,
    maxWidth: 280,
  },
  calloutHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  calloutIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  customCalloutTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  calloutDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  calloutStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  calloutStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  calloutStatusText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  customCalloutTime: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  calloutPointer: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
    alignSelf: "center",
    marginTop: -1,
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
    backgroundColor: "#0EA5E9",
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
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  centerButton: {
    backgroundColor: "#0EA5E9",
    borderWidth: 0,
  },
  centerButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },

  // Slide-Down Dialog Styles
  slideDownContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 100,
  },
  slideDownDialog: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
  },
  slideDownHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  slideDownIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0EA5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  slideDownName: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  slideDownCloseButton: {
    padding: 4,
  },
  slideDownStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  slideDownStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  slideDownStatus: {
    fontSize: 14,
  },
  slideDownAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  slideDownAddress: {
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },

  // Enable Drag Button
  enableDragButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5E9",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  enableDragButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Drag Mode Panel Styles
  dragModePanel: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 150,
  },
  dragModePanelBlur: {
    borderRadius: 16,
    overflow: "hidden",
  },
  dragModePanelContent: {
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  dragModeInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dragModeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0EA5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dragModeTextContainer: {
    flex: 1,
  },
  dragModeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  dragModeSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  dragModeButtons: {
    flexDirection: "row",
    gap: 12,
  },
  dragModeCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  dragModeCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  dragModeSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  dragModeSaveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  dragModeSaveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },

  // Proximity Alert Banner Styles
  proximityAlertBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 200,
  },
  proximityAlertBlur: {
    borderRadius: 12,
    overflow: "hidden",
  },
  proximityAlertContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  proximityAlertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0EA5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  proximityAlertText: {
    flex: 1,
  },
  proximityAlertTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  proximityAlertBody: {
    fontSize: 13,
    color: "#6B7280",
  },
  proximityAlertClose: {
    padding: 4,
  },
});
