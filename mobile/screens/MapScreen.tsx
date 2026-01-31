import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
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
import { useThemeColors, useIsDarkMode } from "../theme/colors";
import { apiRequest } from "../src/lib/queryClient";

/**
 * Vibrant dark-mode style for Google Maps via react-native-maps (PROVIDER_GOOGLE).
 * Goal: keep dark background but restore "colorfulness" (water/parks/roads/labels).
 */

const DARK_MAP_STYLE = [
  // Base
  { elementType: "geometry", stylers: [{ color: "#151a22" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#e6edf7" }] },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#151a22" }, { weight: 2 }],
  },

  // Administrative
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2a3342" }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [{ color: "#dbe7ff" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#dbe7ff" }],
  },

  // Land / natural
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#141a16" }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#121a18" }],
  },

  // Parks (more saturated)
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#0f2a1d" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7ee2a8" }],
  },

  // General POI labels
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#b9c7dd" }],
  },

  // Water (more saturated)
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#082a4a" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7bb6ff" }],
  },

  // Roads (higher contrast + cool tint)
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#263247" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0f141d" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d0ddf3" }],
  },

  // Arterials
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#2d3c56" }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d8e4fb" }],
  },

  // Highways (slightly warmer so they pop)
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3a4e6d" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#111826" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#ffffff" }],
  },

  // Transit
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#1c2533" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9fb2cc" }],
  },
];
const LIGHT_MAP_STYLE: any[] = [];

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
  placeName: string;
  placeCategory?: string;
  originalCoordinate: { latitude: number; longitude: number };
  currentCoordinate: { latitude: number; longitude: number };
}

// Custom marker components
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
  initials,
  onPress,
}: {
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
  isRecent: boolean;
  statusColor: string;
  statusMessage: string;
  initials: string;
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
    home: "#3B82F6",
    work: "#10B981",
    school: "#8B5CF6",
    other: "#F97316",
  };

  const markerColor = color || categoryColors[category || "other"] || "#F97316";

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
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
  const isDarkMode = useIsDarkMode();

  const mapRef = useRef<MapView>(null);
  const hasInitializedLocation = useRef(false);
  const isProgrammaticMove = useRef(false);

  const [localMapType, setLocalMapType] = useState<"standard" | "hybrid">(
    "standard"
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [mapHeading, setMapHeading] = useState(0);
  const [currentRegion, setCurrentRegion] = useState(
    savedRegion || {
      latitude: 40.7128,
      longitude: -74.006,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    }
  );
  const currentRegionRef = useRef(currentRegion);

  const { user } = useAuth();

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
  }>({ visible: false });

  const [selectedMarker, setSelectedMarker] = useState<{
    type: "user" | "family" | "place";
    id?: number;
    name: string;
    statusMessage?: string;
    address?: string;
    category?: string;
    coordinate: { latitude: number; longitude: number };
  } | null>(null);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const queryClient = useQueryClient();

  const slideAnim = useRef(new Animated.Value(-200)).current;

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
  }, [selectedMarker, slideAnim]);

  // Fetch family locations
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
    refetchInterval: 10000,
  });

  // Map type control
  const mapType = mapTypeProp !== undefined ? mapTypeProp : localMapType;
  const setMapType = (type: "standard" | "hybrid") => {
    if (onMapTypeChange) onMapTypeChange(type);
    else setLocalMapType(type);
  };

  const currentLocation = userLocationProp;

  const initialRegion = savedRegion || {
    latitude: 40.7128,
    longitude: -74.006,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const formatTimeAgo = (minutesAgo: number) => {
    if (minutesAgo < 1) return "just now";
    if (minutesAgo < 60) return `${minutesAgo} min ago`;
    if (minutesAgo < 1440) {
      const hours = Math.floor(minutesAgo / 60);
      return `${hours}h ago`;
    }
    const days = Math.floor(minutesAgo / 1440);
    return `${days}d ago`;
  };

  const getStatusInfo = (minutesAgo: number) => {
    if (minutesAgo < 5)
      return { color: "#10B981", message: "Currently active" };
    if (minutesAgo < 15)
      return { color: "#F59E0B", message: `${minutesAgo} min ago` };
    if (minutesAgo < 60)
      return { color: "#F97316", message: `Inactive for ${minutesAgo} min` };
    if (minutesAgo < 1440) {
      const hours = Math.floor(minutesAgo / 60);
      return { color: "#EF4444", message: `Offline for ${hours}h` };
    }
    const days = Math.floor(minutesAgo / 1440);
    return { color: "#6B7280", message: `Offline for ${days}d` };
  };

  const familyLocations: (FamilyLocation & {
    statusColor: string;
    statusMessage: string;
    initials: string;
  })[] = familyLocationsData
    .filter((loc) => loc.user.locationSharingEnabled && loc.timestamp)
    .map((loc) => {
      const now = new Date();
      const timestamp = loc.timestamp ? new Date(loc.timestamp) : new Date(0);
      const minutesAgo = Math.floor(
        (now.getTime() - timestamp.getTime()) / (1000 * 60)
      );
      const isRecent = minutesAgo < 15;
      const statusInfo = getStatusInfo(minutesAgo);

      const fullName =
        loc.user.firstName && loc.user.lastName
          ? `${loc.user.firstName} ${loc.user.lastName}`
          : loc.user.firstName || loc.user.email;

      const initials =
        loc.user.firstName && loc.user.lastName
          ? `${loc.user.firstName[0]}${loc.user.lastName[0]}`.toUpperCase()
          : loc.user.firstName
            ? loc.user.firstName[0].toUpperCase()
            : loc.user.email && loc.user.email.length > 0
              ? loc.user.email[0].toUpperCase()
              : "?";

      return {
        id: loc.user.id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        name: fullName,
        address: `Last seen ${formatTimeAgo(minutesAgo)}`,
        isRecent,
        statusColor: statusInfo.color,
        statusMessage: statusInfo.message,
        initials,
      };
    });

  const familyMembersOnline = familyLocationsData.filter((loc) => {
    if (!loc.user.locationSharingEnabled || !loc.timestamp) return false;
    const now = new Date();
    const timestamp = new Date(loc.timestamp);
    const minutesAgo = Math.floor(
      (now.getTime() - timestamp.getTime()) / (1000 * 60)
    );
    return minutesAgo < 5;
  }).length;

  const onlineMembersCount = familyMembersOnline + 1;

  // Fetch saved places
  const { data: placesData = [] } = useQuery<Place[]>({
    queryKey: ["/api/places"],
    enabled: !!user && isActive,
  });

  const places: Place[] = placesData;

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
      const response = await apiRequest("PATCH", `/api/places/${id}/location`, {
        latitude,
        longitude,
      });
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

  // Proximity alerts
  const sentProximityAlerts = useRef<Set<string>>(new Set());

  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3;
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

  const [proximityAlert, setProximityAlert] = useState<{
    visible: boolean;
    memberName: string;
    placeName: string;
  }>({ visible: false, memberName: "", placeName: "" });

  const showProximityAlert = useCallback(
    (memberName: string, placeName: string) => {
      setProximityAlert({ visible: true, memberName, placeName });
      setTimeout(
        () => setProximityAlert((prev) => ({ ...prev, visible: false })),
        4000
      );
    },
    []
  );

  useEffect(() => {
    if (!familyLocationsData.length || !places.length) return;

    const PROXIMITY_RADIUS = 20;

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
          if (!wasNearby) {
            sentProximityAlerts.current.add(alertKey);
            showProximityAlert(memberName, place.name);
          }
        } else if (distance > PROXIMITY_RADIUS + 10) {
          if (wasNearby) sentProximityAlerts.current.delete(alertKey);
        }
      });
    });
  }, [familyLocationsData, places, calculateDistance, showProximityAlert]);

  // Get location on mount (fast method)
  useEffect(() => {
    if (!hasInitializedLocation.current && !currentLocation) {
      hasInitializedLocation.current = true;
      getLocationFast();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLocationFast = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
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

      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 60000,
      });

      if (lastKnown) {
        const { latitude, longitude } = lastKnown.coords;
        onLocationUpdate?.({ latitude, longitude });

        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        mapRef.current?.animateToRegion(newRegion, 300);
        onRegionChange?.(newRegion);
      }

      const freshLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = freshLocation.coords;
      onLocationUpdate?.({ latitude, longitude });

      if (lastKnown) {
        const distance =
          Math.sqrt(
            Math.pow(latitude - lastKnown.coords.latitude, 2) +
              Math.pow(longitude - lastKnown.coords.longitude, 2)
          ) * 111000;

        if (distance > 50) {
          const newRegion = {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          mapRef.current?.animateToRegion(newRegion, 500);
          onRegionChange?.(newRegion);
        }
      } else {
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        mapRef.current?.animateToRegion(newRegion, 500);
        onRegionChange?.(newRegion);
      }
    } catch (error) {
      console.error("Fast location error:", error);
      getCurrentLocation();
    }
  };

  // Focus location handler
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
  }, [focusLocation, onLocationFocused]);

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);

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

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      onLocationUpdate?.({ latitude, longitude });

      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setIsLoadingLocation(false);

      mapRef.current?.animateToRegion(newRegion, 1000);
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
    if (dragState) return;
    if (currentLocation) {
      isProgrammaticMove.current = true;
      mapRef.current?.animateToRegion(
        { ...currentLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        1000
      );
      setTimeout(() => {
        isProgrammaticMove.current = false;
      }, 1100);
    } else {
      getCurrentLocation();
    }
  };

  const zoomIn = () => {
    if (dragState) return;
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
    if (dragState) return;
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
    if (dragState) return;
    mapRef.current?.animateCamera({ heading: 0 }, { duration: 300 });
  };

  const toggleMapType = () => {
    setMapType(mapType === "standard" ? "hybrid" : "standard");
  };

  return (
    <View style={styles.container}>
      <StatusBar style={colors.statusBarStyle} />

      <MapView
        // Remount on theme/mapType change so style applies reliably on Android
        key={`map-${isDarkMode ? "dark" : "light"}-${mapType}`}
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        customMapStyle={isDarkMode ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
        initialRegion={currentRegionRef.current}
        onRegionChange={() => {
          mapRef.current
            ?.getCamera()
            .then((camera) => setMapHeading(camera.heading || 0));
          if (selectedMarker && !isProgrammaticMove.current && !dragState)
            setSelectedMarker(null);
        }}
        onRegionChangeComplete={(region) => {
          setCurrentRegion(region);
          currentRegionRef.current = region;
          isProgrammaticMove.current = false;

          if (isActive) onRegionChange?.(region);

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
        // IMPORTANT: keep POIs ON to retain "colorful" feel in dark mode
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
              if (dragState) return;
              isProgrammaticMove.current = true;
              mapRef.current?.animateToRegion(
                {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: currentRegion.latitudeDelta,
                  longitudeDelta: currentRegion.longitudeDelta,
                },
                300
              );
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
            initials={location.initials}
            onPress={() => {
              if (dragState) return;
              isProgrammaticMove.current = true;
              mapRef.current?.animateToRegion(
                {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: currentRegion.latitudeDelta,
                  longitudeDelta: currentRegion.longitudeDelta,
                },
                300
              );
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

        {/* Saved Places Markers (hide the one being repositioned) */}
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
              color={place.color}
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
        <View style={styles.repositionMarkerContainer} pointerEvents="none">
          <View
            style={[
              styles.repositionMarker,
              {
                backgroundColor:
                  {
                    home: "#3B82F6",
                    work: "#10B981",
                    school: "#8B5CF6",
                    other: "#F97316",
                  }[dragState.placeCategory || "other"] || "#F97316",
              },
            ]}
          >
            <View style={styles.repositionMarkerDot} />
          </View>
        </View>
      )}

      {/* Notification Bell */}
      <View style={[styles.notificationBell, { top: insets.top + 16 }]}>
        <NotificationBell />
      </View>

      {/* Compass */}
      <View style={[styles.compassButton, { bottom: 72, left: 16 }]}>
        <Compass heading={mapHeading} onPress={resetNorth} />
      </View>

      {/* Members Indicator */}
      <View style={[styles.membersIndicator, { top: insets.top + 16 }]}>
        <BlurView
          intensity={80}
          tint={isDarkMode ? "dark" : "light"}
          style={styles.membersIndicatorBlur}
        >
          <View style={styles.membersIndicatorContent}>
            <View style={styles.onlineAvatarsRow}>
              {/* Current user avatar */}
              <View style={styles.onlineAvatarContainer}>
                <View
                  style={[
                    styles.onlineAvatar,
                    { backgroundColor: colors.avatarBackground },
                  ]}
                >
                  <Text style={styles.onlineAvatarText}>
                    {user?.firstName && user?.lastName
                      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                      : user?.firstName
                        ? user.firstName[0].toUpperCase()
                        : user?.email && user.email.length > 0
                          ? user.email[0].toUpperCase()
                          : "?"}
                  </Text>
                </View>
                <View style={styles.onlineAvatarDot} />
              </View>
              {/* Online family members */}
              {familyLocations
                .filter((loc) => loc.isRecent)
                .slice(0, 3)
                .map((loc) => (
                  <View key={loc.id} style={styles.onlineAvatarContainer}>
                    <View
                      style={[
                        styles.onlineAvatar,
                        { backgroundColor: "#6366F1" },
                      ]}
                    >
                      <Text style={styles.onlineAvatarText}>
                        {loc.initials}
                      </Text>
                    </View>
                    <View style={styles.onlineAvatarDot} />
                  </View>
                ))}
              {familyLocations.filter((loc) => loc.isRecent).length > 3 && (
                <View
                  style={[
                    styles.onlineAvatar,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  <Text
                    style={[
                      styles.onlineAvatarText,
                      { color: colors.text, fontSize: 9 },
                    ]}
                  >
                    +{familyLocations.filter((loc) => loc.isRecent).length - 3}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.membersText, isDarkMode && { color: "#FFFFFF" }]}
            >
              {onlineMembersCount} online
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

      {/* Map Controls */}
      <View style={{ position: "absolute", right: 16, bottom: 72, gap: 8 }}>
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

      {/* Slide-Down Dialog */}
      <Animated.View
        style={[
          styles.slideDownContainer,
          { transform: [{ translateY: slideAnim }], top: insets.top },
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
                    { backgroundColor: "#10B981" },
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
                    placeName: selectedMarker.name,
                    placeCategory: selectedMarker.category,
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

      {/* Drag Mode Panel */}
      {dragState && (
        <View style={[styles.dragModePanel, { top: insets.top + 60 }]}>
          <View
            style={[
              styles.dragModePanelContent,
              {
                backgroundColor: colors.dialogBackground,
                borderColor: colors.dialogBorder,
                borderWidth: 1,
                borderRadius: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
              },
            ]}
          >
            <View style={styles.dragModeInfo}>
              <View style={styles.dragModeIconContainer}>
                <Ionicons name="locate" size={20} color="#fff" />
              </View>
              <View style={styles.dragModeTextContainer}>
                <Text
                  style={[styles.dragModeTitle, { color: colors.dialogText }]}
                >
                  Reposition Mode
                </Text>
                <Text
                  style={[
                    styles.dragModeSubtitle,
                    { color: colors.dialogTextSecondary },
                  ]}
                >
                  Pan the map to move the crosshair
                </Text>
              </View>
            </View>

            <View style={styles.dragModeButtons}>
              <TouchableOpacity
                style={[
                  styles.dragModeCancelButton,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
                onPress={() => {
                  setDragState(null);
                  isProgrammaticMove.current = false;
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dragModeCancelText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
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
        </View>
      )}

      {/* Proximity Alert Banner */}
      {proximityAlert.visible && (
        <View style={[styles.proximityAlertBanner, { top: insets.top + 60 }]}>
          <View
            style={[
              styles.proximityAlertContent,
              {
                backgroundColor: colors.dialogBackground,
                borderColor: colors.dialogBorder,
                borderWidth: 1,
                borderRadius: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
              },
            ]}
          >
            <View style={styles.proximityAlertIcon}>
              <Ionicons name="location" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.proximityAlertText}>
              <Text
                style={[
                  styles.proximityAlertTitle,
                  { color: colors.dialogText },
                ]}
              >
                📍 {proximityAlert.memberName} arrived
              </Text>
              <Text
                style={[
                  styles.proximityAlertBody,
                  { color: colors.dialogTextSecondary },
                ]}
              >
                Now at {proximityAlert.placeName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                setProximityAlert((prev) => ({ ...prev, visible: false }))
              }
              style={styles.proximityAlertClose}
            >
              <Ionicons name="close" size={18} color={colors.dialogTextMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

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
  container: { flex: 1 },
  map: { flex: 1 },

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
    width: 44,
    height: 44,
    position: "relative",
  },
  familyMarkerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6366F1",
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
  familyMarkerAvatarOld: {
    opacity: 0.6,
    backgroundColor: "#9CA3AF",
  },
  familyMarkerInitials: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  familyMarkerStatusDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
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
  familyMarkerOld: { opacity: 0.3 },
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

  // Reposition marker for repositioning mode
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
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },

  // Notification Bell
  notificationBell: {
    position: "absolute",
    right: 16,
    zIndex: 40,
  },

  // Compass Button
  compassButton: {
    position: "absolute",
    zIndex: 40,
  },

  // Members Indicator
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
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  membersIndicatorContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    height: 44,
    gap: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  onlineAvatarsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  onlineAvatarContainer: {
    position: "relative",
    marginRight: -6,
  },
  onlineAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  onlineAvatarText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  onlineAvatarDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  membersText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },

  // Banner
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
  bannerTextContainer: { flex: 1 },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  bannerDescription: { fontSize: 12, color: "#666" },
  bannerButton: {
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bannerButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // Loading
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
  loadingText: { fontSize: 14, color: "#333", fontWeight: "500" },

  // Control Buttons
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
  centerButton: { backgroundColor: "#0EA5E9", borderWidth: 0 },
  centerButtonDisabled: { backgroundColor: "#9CA3AF" },

  // Slide-Down Dialog
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
  slideDownHeader: { flexDirection: "row", alignItems: "center" },
  slideDownIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0EA5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  slideDownName: { fontSize: 18, fontWeight: "600", flex: 1 },
  slideDownCloseButton: { padding: 4 },
  slideDownStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  slideDownStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  slideDownStatus: { fontSize: 14 },
  slideDownAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  slideDownAddress: { fontSize: 13, marginLeft: 6, flex: 1 },

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
  enableDragButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Drag Mode Panel
  dragModePanel: { position: "absolute", left: 16, right: 16, zIndex: 150 },
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
  dragModeTextContainer: { flex: 1 },
  dragModeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  dragModeSubtitle: { fontSize: 13, color: "#6B7280" },
  dragModeButtons: { flexDirection: "row", gap: 12 },
  dragModeCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  dragModeCancelText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  dragModeSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  dragModeSaveButtonDisabled: { backgroundColor: "#9CA3AF" },
  dragModeSaveText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  // Proximity Alert Banner
  proximityAlertBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 200,
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
  proximityAlertText: { flex: 1 },
  proximityAlertTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  proximityAlertBody: { fontSize: 13, color: "#6B7280" },
  proximityAlertClose: { padding: 4 },
});
