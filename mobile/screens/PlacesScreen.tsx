import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Keyboard,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useThemeColors } from "../theme/colors";
import { apiRequest } from "../src/lib/queryClient";
import { useAuth } from "../src/contexts/AuthContext";

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface Place {
  id: number;
  userId: number;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  category?: string;
  color?: string;
  user: User;
}

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: "home",
  work: "briefcase",
  school: "school",
  other: "location",
};

const categoryColors: Record<string, string> = {
  home: "#3B82F6",
  work: "#10B981",
  school: "#8B5CF6",
  other: "#F97316",
};

const pinColors = [
  { name: "Purple", value: "#8b5cf6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Pink", value: "#ec4899" },
  { name: "Yellow", value: "#eab308" },
  { name: "Gray", value: "#6b7280" },
];

const defaultCategories = [
  { label: "Home", value: "home", icon: "home" as const, color: "#3B82F6" },
  {
    label: "Work",
    value: "work",
    icon: "briefcase" as const,
    color: "#10B981",
  },
  {
    label: "School",
    value: "school",
    icon: "school" as const,
    color: "#8B5CF6",
  },
  {
    label: "Other",
    value: "other",
    icon: "location" as const,
    color: "#F97316",
  },
];

export default function PlacesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const addBackdropAnim = useRef(new Animated.Value(0)).current;
  const addSlideAnim = useRef(new Animated.Value(300)).current;

  const openAddModal = () => {
    setAddModalVisible(true);
    Animated.parallel([
      Animated.timing(addBackdropAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(addSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
    ]).start();
  };

  const closeAddModal = () => {
    Animated.parallel([
      Animated.timing(addBackdropAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(addSlideAnim, {
        toValue: 800,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAddModalVisible(false);
      addSlideAnim.setValue(300);
    });
  };

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [newPlace, setNewPlace] = useState({
    name: "",
    address: "",
    latitude: 0,
    longitude: 0,
    category: "other",
    color: "#8b5cf6",
  });
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<
    Array<{
      name: string;
      address: string;
      latitude: number;
      longitude: number;
    }>
  >([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const addressInputRef = useRef<TextInput>(null);
  const [addressSelection, setAddressSelection] = useState<
    { start: number; end: number } | undefined
  >(undefined);

  // Custom categories state
  const [customCategories, setCustomCategories] = useState<
    Array<{
      label: string;
      value: string;
      icon: keyof typeof Ionicons.glyphMap;
      color: string;
    }>
  >([]);
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [newCategory, setNewCategory] = useState({
    label: "",
    icon: "bookmark" as keyof typeof Ionicons.glyphMap,
    color: "#6B7280",
  });

  // Combined categories (default + custom)
  const categories = [...defaultCategories, ...customCategories];

  // Photon API for OpenStreetMap-based autocomplete
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearchingAddress(true);
    try {
      const url = `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&limit=5`;
      const response = await fetch(url);
      const data = await response.json();

      const suggestions =
        data.features?.map((feature: any) => {
          const props = feature.properties;
          const coords = feature.geometry.coordinates;

          // Build a readable address from properties
          const parts: string[] = [];
          if (props.name) parts.push(props.name);
          if (props.housenumber && props.street) {
            parts.push(`${props.housenumber} ${props.street}`);
          } else if (props.street) {
            parts.push(props.street);
          }
          if (props.city) parts.push(props.city);
          if (props.state) parts.push(props.state);
          if (props.country) parts.push(props.country);

          return {
            name: props.name || props.street || "Unknown",
            address: parts.join(", "),
            latitude: coords[1], // GeoJSON is [lon, lat]
            longitude: coords[0],
          };
        }) || [];

      setAddressSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error("Address search error:", error);
      setAddressSuggestions([]);
    } finally {
      setIsSearchingAddress(false);
    }
  }, []);

  // Debounced address search
  const handleAddressChange = useCallback(
    (text: string) => {
      setNewPlace((prev) => ({ ...prev, address: text }));

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Debounce the search
      searchTimeoutRef.current = setTimeout(() => {
        searchAddress(text);
      }, 300);
    },
    [searchAddress]
  );

  // Select a suggestion
  const selectSuggestion = useCallback(
    (suggestion: {
      name: string;
      address: string;
      latitude: number;
      longitude: number;
    }) => {
      setNewPlace((prev) => ({
        ...prev,
        address: suggestion.address,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
      }));
      setShowSuggestions(false);
      setAddressSuggestions([]);
      Keyboard.dismiss();

      // Reset scroll to start so user sees beginning of address
      setTimeout(() => {
        if (addressInputRef.current) {
          addressInputRef.current.focus();
          setAddressSelection({ start: 0, end: 0 });
          setTimeout(() => {
            addressInputRef.current?.blur();
            setAddressSelection(undefined);
          }, 50);
        }
      }, 100);
    },
    []
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const {
    data: places = [],
    isLoading,
    refetch,
  } = useQuery<Place[]>({
    queryKey: ["/api/places"],
    enabled: !!user,
  });

  const addPlaceMutation = useMutation({
    mutationFn: async (placeData: typeof newPlace) => {
      const res = await apiRequest("POST", "/api/places", placeData);
      return await res.json();
    },
    onSuccess: () => {
      Alert.alert("Success", "Place saved successfully!");
      closeAddModal();
      resetNewPlace();
      queryClient.invalidateQueries({ queryKey: ["/api/places"] });
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to save place");
    },
  });

  const editPlaceMutation = useMutation({
    mutationFn: async (placeData: {
      id: number;
      name: string;
      category: string;
      color: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/places/${placeData.id}`, {
        name: placeData.name,
        category: placeData.category,
        color: placeData.color,
      });
      return await res.json();
    },
    onSuccess: () => {
      Alert.alert("Success", "Place updated successfully!");
      setEditModalVisible(false);
      setEditingPlace(null);
      queryClient.invalidateQueries({ queryKey: ["/api/places"] });
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to update place");
    },
  });

  const deletePlaceMutation = useMutation({
    mutationFn: async (placeId: number) => {
      await apiRequest("DELETE", `/api/places/${placeId}`);
    },
    onSuccess: () => {
      Alert.alert("Success", "Place deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["/api/places"] });
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to delete place");
    },
  });

  const resetNewPlace = () => {
    setNewPlace({
      name: "",
      address: "",
      latitude: 0,
      longitude: 0,
      category: "other",
      color: "#8b5cf6",
    });
    setUseCurrentLocation(false);
  };

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to use this feature"
        );
        setIsGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;

      const coordsAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      setNewPlace((prev) => ({
        ...prev,
        latitude,
        longitude,
        address: coordsAddress,
      }));
      setUseCurrentLocation(true);
      setIsGettingLocation(false);

      setTimeout(() => {
        if (addressInputRef.current) {
          addressInputRef.current.focus();
          setAddressSelection({ start: 0, end: 0 });
          setTimeout(() => {
            addressInputRef.current?.blur();
            setAddressSelection(undefined);
          }, 50);
        }
      }, 100);

      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=18`,
        {
          headers: {
            "User-Agent": "FamilyLocator/1.0",
          },
        }
      )
        .then((response) => response.json())
        .then((data) => {
          if (data && data.address) {
            const addr = data.address;
            const parts: string[] = [];
            const houseNumber = addr.house_number || "";
            const road =
              addr.road || addr.pedestrian || addr.footway || addr.path || "";
            if (houseNumber && road) {
              parts.push(`${houseNumber} ${road}`);
            } else if (road) {
              parts.push(road);
            } else if (data.display_name) {
              const displayParts = data.display_name.split(", ");
              parts.push(displayParts.slice(0, 3).join(", "));
            }
            const city =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.hamlet ||
              addr.suburb ||
              "";
            if (city) parts.push(city);
            if (addr.state) parts.push(addr.state);
            if (addr.postcode) parts.push(addr.postcode);

            if (parts.length > 0) {
              setNewPlace((prev) => ({
                ...prev,
                address: parts.join(", "),
              }));
            }
          }
        })
        .catch(() => {});
    } catch (error) {
      Alert.alert("Error", "Could not get your current location");
      setUseCurrentLocation(false);
      setIsGettingLocation(false);
    }
  };

  const handleAddPlace = () => {
    if (!newPlace.name.trim()) {
      Alert.alert("Error", "Please enter a place name");
      return;
    }
    if (!newPlace.latitude || !newPlace.longitude) {
      Alert.alert("Error", "Please use current location or enter an address");
      return;
    }
    addPlaceMutation.mutate(newPlace);
  };

  const handleEditPlace = (place: Place) => {
    setEditingPlace(place);
    setEditModalVisible(true);
  };

  const handleUpdatePlace = () => {
    if (!editingPlace) return;
    editPlaceMutation.mutate({
      id: editingPlace.id,
      name: editingPlace.name,
      category: editingPlace.category || "other",
      color: editingPlace.color || "#8b5cf6",
    });
  };

  const handleDeletePlace = (place: Place) => {
    Alert.alert(
      "Delete Place",
      `Are you sure you want to delete "${place.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deletePlaceMutation.mutate(place.id),
        },
      ]
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const groupedPlaces = places.reduce(
    (acc: Record<string, Place[]>, place: Place) => {
      const category = place.category || "other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(place);
      return acc;
    },
    {}
  );

  const renderPlaceCard = (place: Place) => {
    const category = place.category || "other";
    const icon = categoryIcons[category] || "location";
    const iconColor = categoryColors[category] || "#F97316";

    return (
      <View
        key={place.id}
        style={[
          styles.placeCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.inputBorder,
          },
        ]}
        data-testid={`card-place-${place.id}`}
      >
        <View style={styles.placeCardContent}>
          <View
            style={[
              styles.placeIconContainer,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
          <View style={styles.placeInfo}>
            <Text
              style={[styles.placeName, { color: colors.text }]}
              numberOfLines={1}
            >
              {place.name}
            </Text>
            <Text
              style={[styles.placeAddress, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {place.address || "No address"}
            </Text>
            <Text style={[styles.placeAddedBy, { color: colors.textMuted }]}>
              Added by {place.user?.firstName || place.user?.email || "Unknown"}
            </Text>
          </View>
          <View style={styles.placeActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditPlace(place)}
              data-testid={`button-edit-place-${place.id}`}
            >
              <Ionicons name="create" size={20} color="#0EA5E9" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeletePlace(place)}
              data-testid={`button-delete-place-${place.id}`}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderAddModal = () => (
    <Modal
      visible={addModalVisible}
      transparent
      animationType="none"
      onRequestClose={closeAddModal}
    >
      <Animated.View
        style={[styles.modalBackdrop, { opacity: addBackdropAnim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAddModal} />
      </Animated.View>
      <Animated.View
        style={[
          styles.modalSlideContainer,
          { transform: [{ translateY: addSlideAnim }] },
        ]}
      >
        <Pressable
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add New Place
            </Text>
            <TouchableOpacity
              onPress={closeAddModal}
              data-testid="button-close-add-modal"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Place Name *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="e.g. Home, Office, School"
                placeholderTextColor={colors.textMuted}
                value={newPlace.name}
                onChangeText={(text) =>
                  setNewPlace((prev) => ({ ...prev, name: text }))
                }
                data-testid="input-place-name"
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Address *
                </Text>
                <TouchableOpacity
                  style={[
                    styles.locationButton,
                    { borderColor: colors.primary },
                  ]}
                  onPress={getCurrentLocation}
                  disabled={isGettingLocation}
                  data-testid="button-use-current-location"
                >
                  {isGettingLocation ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons
                        name="location"
                        size={14}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.locationButtonText,
                          { color: colors.primary },
                        ]}
                      >
                        Use Current Location
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.addressInputContainer}>
                <TextInput
                  ref={addressInputRef}
                  style={[
                    styles.input,
                    styles.addressInputWithClear,
                    {
                      backgroundColor: useCurrentLocation
                        ? colors.surfaceSecondary
                        : colors.inputBackground,
                      borderColor: useCurrentLocation
                        ? colors.primary
                        : colors.inputBorder,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Start typing an address..."
                  placeholderTextColor={colors.textMuted}
                  value={newPlace.address}
                  onChangeText={(text) => {
                    setUseCurrentLocation(false);
                    handleAddressChange(text);
                  }}
                  multiline={false}
                  scrollEnabled={true}
                  selection={addressSelection}
                  onSelectionChange={() => {
                    if (addressSelection) {
                      setAddressSelection(undefined);
                    }
                  }}
                  data-testid="input-place-address"
                />
                {newPlace.address.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearAddressButton}
                    onPress={() => {
                      setNewPlace((prev) => ({
                        ...prev,
                        address: "",
                        latitude: 0,
                        longitude: 0,
                      }));
                      setUseCurrentLocation(false);
                      setAddressSuggestions([]);
                      setShowSuggestions(false);
                    }}
                    data-testid="button-clear-address"
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                )}
                {isSearchingAddress && (
                  <View style={styles.searchingIndicator}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )}
              </View>

              {/* Address Suggestions Dropdown */}
              {showSuggestions && addressSuggestions.length > 0 && (
                <View
                  style={[
                    styles.suggestionsContainer,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {addressSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.suggestionItem,
                        index < addressSuggestions.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        },
                      ]}
                      onPress={() => selectSuggestion(suggestion)}
                      data-testid={`suggestion-${index}`}
                    >
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={colors.primary}
                        style={styles.suggestionIcon}
                      />
                      <View style={styles.suggestionText}>
                        <Text
                          style={[
                            styles.suggestionName,
                            { color: colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {suggestion.name}
                        </Text>
                        <Text
                          style={[
                            styles.suggestionAddress,
                            { color: colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {suggestion.address}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Category
              </Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor:
                          newPlace.category === cat.value
                            ? cat.color
                            : colors.surfaceSecondary,
                        borderColor:
                          newPlace.category === cat.value
                            ? cat.color
                            : colors.border,
                      },
                    ]}
                    onPress={() =>
                      setNewPlace((prev) => ({ ...prev, category: cat.value }))
                    }
                    data-testid={`button-category-${cat.value}`}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={18}
                      color={
                        newPlace.category === cat.value
                          ? "#FFFFFF"
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.categoryButtonText,
                        {
                          color:
                            newPlace.category === cat.value
                              ? "#FFFFFF"
                              : colors.text,
                        },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderStyle: "dashed",
                    },
                  ]}
                  onPress={() => setAddCategoryModalVisible(true)}
                  data-testid="button-add-category"
                >
                  <Ionicons name="add" size={18} color={colors.textSecondary} />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Add
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Pin Color
              </Text>
              <View style={styles.colorGrid}>
                {pinColors.map((color) => (
                  <TouchableOpacity
                    key={color.value}
                    style={[
                      styles.colorButton,
                      { backgroundColor: color.value },
                      newPlace.color === color.value &&
                        styles.colorButtonActive,
                    ]}
                    onPress={() =>
                      setNewPlace((prev) => ({ ...prev, color: color.value }))
                    }
                    data-testid={`button-color-${color.name.toLowerCase()}`}
                  />
                ))}
              </View>
              <Text style={[styles.colorHint, { color: colors.textMuted }]}>
                Choose a color for your place pin on the map
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={closeAddModal}
              data-testid="button-cancel-add"
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.primary },
                addPlaceMutation.isPending && styles.buttonDisabled,
              ]}
              onPress={handleAddPlace}
              disabled={addPlaceMutation.isPending}
              data-testid="button-save-place"
            >
              {addPlaceMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Place</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Animated.View>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal
      visible={editModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setEditModalVisible(false)}
    >
      <View style={styles.modalBackdrop} />
      <Pressable
        style={styles.modalSlideContainer}
        onPress={() => setEditModalVisible(false)}
      >
        <Pressable
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Edit Place
            </Text>
            <TouchableOpacity
              onPress={() => setEditModalVisible(false)}
              data-testid="button-close-edit-modal"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {editingPlace && (
            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Place Name *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                    },
                  ]}
                  placeholder="e.g. Home, Office, School"
                  placeholderTextColor={colors.textMuted}
                  value={editingPlace.name}
                  onChangeText={(text) =>
                    setEditingPlace((prev) =>
                      prev ? { ...prev, name: text } : null
                    )
                  }
                  data-testid="input-edit-place-name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Category
                </Text>
                <View style={styles.categoryGrid}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryButton,
                        {
                          backgroundColor:
                            (editingPlace.category || "other") === cat.value
                              ? cat.color
                              : colors.surfaceSecondary,
                          borderColor:
                            (editingPlace.category || "other") === cat.value
                              ? cat.color
                              : colors.border,
                        },
                      ]}
                      onPress={() =>
                        setEditingPlace((prev) =>
                          prev ? { ...prev, category: cat.value } : null
                        )
                      }
                      data-testid={`button-edit-category-${cat.value}`}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={18}
                        color={
                          (editingPlace.category || "other") === cat.value
                            ? "#FFFFFF"
                            : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.categoryButtonText,
                          {
                            color:
                              (editingPlace.category || "other") === cat.value
                                ? "#FFFFFF"
                                : colors.text,
                          },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                        borderStyle: "dashed",
                      },
                    ]}
                    onPress={() => setAddCategoryModalVisible(true)}
                    data-testid="button-add-category-edit"
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryButtonText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Pin Color
                </Text>
                <View style={styles.colorGrid}>
                  {pinColors.map((color) => (
                    <TouchableOpacity
                      key={color.value}
                      style={[
                        styles.colorButton,
                        { backgroundColor: color.value },
                        (editingPlace.color || "#8b5cf6") === color.value &&
                          styles.colorButtonActive,
                      ]}
                      onPress={() =>
                        setEditingPlace((prev) =>
                          prev ? { ...prev, color: color.value } : null
                        )
                      }
                      data-testid={`button-edit-color-${color.name.toLowerCase()}`}
                    />
                  ))}
                </View>
              </View>
            </ScrollView>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={() => setEditModalVisible(false)}
              data-testid="button-cancel-edit"
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.primary },
                editPlaceMutation.isPending && styles.buttonDisabled,
              ]}
              onPress={handleUpdatePlace}
              disabled={editPlaceMutation.isPending}
              data-testid="button-update-place"
            >
              {editPlaceMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Update Place</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View
        style={[
          styles.emptyIconContainer,
          { backgroundColor: colors.surfaceSecondary },
        ]}
      >
        <Ionicons name="bookmark-outline" size={48} color={colors.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No saved places yet
      </Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Save your favorite places for quick access and easy sharing
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
        onPress={openAddModal}
        data-testid="button-add-first-place"
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Add Your First Place</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingSkeleton = () => (
    <View style={styles.loadingContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonGroup}>
          <View
            style={[
              styles.skeletonTitle,
              { backgroundColor: colors.skeletonBackground },
            ]}
          />
          {[1, 2].map((j) => (
            <View
              key={j}
              style={[
                styles.skeletonCard,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <View
                style={[
                  styles.skeletonIcon,
                  { backgroundColor: colors.skeletonBackground },
                ]}
              />
              <View style={styles.skeletonContent}>
                <View
                  style={[
                    styles.skeletonLine,
                    { backgroundColor: colors.skeletonBackground },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLineShort,
                    { backgroundColor: colors.skeletonBackground },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );

  const renderStatistics = () => (
    <View style={styles.statsContainer}>
      <View
        style={[
          styles.statCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.inputBorder,
          },
        ]}
        data-testid="stat-total-places"
      >
        <Text style={[styles.statNumber, { color: colors.primary }]}>
          {places.length}
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          Total Places
        </Text>
      </View>
      <View
        style={[
          styles.statCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.inputBorder,
          },
        ]}
        data-testid="stat-categories"
      >
        <Text style={[styles.statNumber, { color: "#10B981" }]}>
          {Object.keys(groupedPlaces).length}
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          Categories
        </Text>
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.headerBackground },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.headerBackground,
            borderBottomColor: colors.headerBorder,
          },
        ]}
      >
        <Text style={[styles.headerText, { color: colors.text }]}>Places</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={openAddModal}
          data-testid="button-add-place"
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Place</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.content, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          renderLoadingSkeleton()
        ) : places.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {Object.entries(groupedPlaces).map(([category, categoryPlaces]) => {
              const icon = categoryIcons[category] || "location";
              const iconColor = categoryColors[category] || "#F97316";

              return (
                <View key={category} style={styles.categorySection}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name={icon} size={20} color={iconColor} />
                    <Text
                      style={[styles.categoryTitle, { color: colors.text }]}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </View>
                  {categoryPlaces.map(renderPlaceCard)}
                </View>
              );
            })}
            {renderStatistics()}
          </>
        )}
      </ScrollView>

      {renderAddModal()}
      {renderEditModal()}

      {/* Add Category Modal */}
      <Modal
        visible={addCategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddCategoryModalVisible(false)}
      >
        <Pressable
          style={styles.categoryModalOverlay}
          onPress={() => setAddCategoryModalVisible(false)}
        >
          <Pressable
            style={[
              styles.categoryModalContent,
              { backgroundColor: colors.surface },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.categoryModalHeader,
                { borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.categoryModalHeaderLeft}>
                <View
                  style={[
                    styles.categoryModalIcon,
                    { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <Ionicons name="add" size={20} color={colors.primary} />
                </View>
                <Text
                  style={[styles.categoryModalTitle, { color: colors.text }]}
                >
                  Add Category
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setAddCategoryModalVisible(false);
                  setNewCategory({
                    label: "",
                    icon: "bookmark",
                    color: "#6B7280",
                  });
                }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.categoryModalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Category name"
                  placeholderTextColor={colors.textMuted}
                  value={newCategory.label}
                  onChangeText={(text) =>
                    setNewCategory((prev) => ({ ...prev, label: text }))
                  }
                  data-testid="input-new-category-name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Icon</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.iconScrollContent}
                >
                  {[
                    "bookmark",
                    "heart",
                    "star",
                    "flag",
                    "cart",
                    "cafe",
                    "restaurant",
                    "fitness",
                    "medical",
                    "airplane",
                    "car",
                    "bus",
                  ].map((iconName) => (
                    <TouchableOpacity
                      key={iconName}
                      style={[
                        styles.iconButton,
                        {
                          backgroundColor:
                            newCategory.icon === iconName
                              ? newCategory.color
                              : colors.surfaceSecondary,
                          borderColor:
                            newCategory.icon === iconName
                              ? newCategory.color
                              : colors.border,
                        },
                      ]}
                      onPress={() =>
                        setNewCategory((prev) => ({
                          ...prev,
                          icon: iconName as keyof typeof Ionicons.glyphMap,
                        }))
                      }
                      data-testid={`icon-${iconName}`}
                    >
                      <Ionicons
                        name={iconName as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={
                          newCategory.icon === iconName
                            ? "#FFFFFF"
                            : colors.textSecondary
                        }
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={[styles.formGroup, { marginBottom: 0 }]}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Color
                </Text>
                <View style={styles.colorGrid}>
                  {pinColors.map((color) => (
                    <TouchableOpacity
                      key={color.value}
                      style={[
                        styles.colorButton,
                        { backgroundColor: color.value },
                        newCategory.color === color.value &&
                          styles.colorButtonActive,
                      ]}
                      onPress={() =>
                        setNewCategory((prev) => ({
                          ...prev,
                          color: color.value,
                        }))
                      }
                      data-testid={`category-color-${color.name}`}
                    >
                      {newCategory.color === color.value && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View
              style={[
                styles.categoryModalFooter,
                { borderTopColor: colors.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.categoryModalButton,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
                onPress={() => {
                  setAddCategoryModalVisible(false);
                  setNewCategory({
                    label: "",
                    icon: "bookmark",
                    color: "#6B7280",
                  });
                }}
                data-testid="button-cancel-category"
              >
                <Text
                  style={[
                    styles.categoryModalButtonText,
                    { color: colors.text },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.categoryModalButton,
                  { backgroundColor: newCategory.color },
                  !newCategory.label.trim() && { opacity: 0.5 },
                ]}
                onPress={() => {
                  if (!newCategory.label.trim()) {
                    Alert.alert("Error", "Please enter a category name");
                    return;
                  }
                  const value = newCategory.label
                    .toLowerCase()
                    .replace(/\s+/g, "_");
                  setCustomCategories((prev) => [
                    ...prev,
                    {
                      label: newCategory.label,
                      value,
                      icon: newCategory.icon,
                      color: newCategory.color,
                    },
                  ]);
                  setAddCategoryModalVisible(false);
                  setNewCategory({
                    label: "",
                    icon: "bookmark",
                    color: "#6B7280",
                  });
                }}
                disabled={!newCategory.label.trim()}
                data-testid="button-save-category"
              >
                <Text
                  style={[styles.categoryModalButtonText, { color: "#FFFFFF" }]}
                >
                  Add Category
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  placeCard: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
  },
  placeCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  placeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  placeAddress: {
    fontSize: 13,
    marginBottom: 2,
  },
  placeAddedBy: {
    fontSize: 12,
  },
  placeActions: {
    flexDirection: "row",
    gap: 4,
  },
  actionButton: {
    padding: 8,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalSlideContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalScroll: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  locationButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorButtonActive: {
    borderColor: "#1F2937",
    borderWidth: 3,
  },
  iconGrid: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  categoryModalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    overflow: "hidden",
  },
  categoryModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  categoryModalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryModalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryModalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  categoryModalBody: {
    padding: 20,
  },
  iconScrollContent: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  categoryModalFooter: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  categoryModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  categoryModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  colorHint: {
    fontSize: 12,
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    gap: 24,
  },
  skeletonGroup: {
    gap: 12,
  },
  skeletonTitle: {
    width: 100,
    height: 24,
    borderRadius: 6,
  },
  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  skeletonContent: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    width: "60%",
    height: 16,
    borderRadius: 4,
  },
  skeletonLineShort: {
    width: "40%",
    height: 12,
    borderRadius: 4,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  addressInputContainer: {
    position: "relative",
  },
  addressInputWithClear: {
    paddingRight: 40,
  },
  clearAddressButton: {
    position: "absolute",
    right: 12,
    top: 14,
    padding: 2,
  },
  searchingIndicator: {
    position: "absolute",
    right: 38,
    top: 14,
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  suggestionIcon: {
    marginRight: 10,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  suggestionAddress: {
    fontSize: 12,
  },
});
