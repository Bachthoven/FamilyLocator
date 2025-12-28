import React, { useState, useCallback, useRef } from "react";
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
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapView, { PROVIDER_GOOGLE, Region } from "react-native-maps";
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

const categories = [
  { label: "Home", value: "home", icon: "home" as const },
  { label: "Work", value: "work", icon: "briefcase" as const },
  { label: "School", value: "school", icon: "school" as const },
  { label: "Other", value: "other", icon: "location" as const },
];

export default function PlacesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapPickerMode, setMapPickerMode] = useState<"add" | "edit">("add");
  const [mapPickerRegion, setMapPickerRegion] = useState<Region>({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const mapPickerRef = useRef<MapView>(null);

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
      setAddModalVisible(false);
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
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setNewPlace((prev) => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: `GPS: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`,
      }));
      setUseCurrentLocation(true);
    } catch (error) {
      Alert.alert("Error", "Could not get your current location");
    } finally {
      setIsGettingLocation(false);
    }
  };

  const openMapPicker = async (mode: "add" | "edit") => {
    setMapPickerMode(mode);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        setMapPickerRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      // Use default region if location unavailable
    }
    setMapPickerVisible(true);
  };

  const confirmMapSelection = () => {
    const coordsText = `${mapPickerRegion.latitude.toFixed(6)}, ${mapPickerRegion.longitude.toFixed(6)}`;
    if (mapPickerMode === "add") {
      setNewPlace((prev) => ({
        ...prev,
        latitude: mapPickerRegion.latitude,
        longitude: mapPickerRegion.longitude,
        address: `Selected: ${coordsText}`,
      }));
      setUseCurrentLocation(true);
    } else if (mapPickerMode === "edit" && editingPlace) {
      setEditingPlace((prev) =>
        prev
          ? {
              ...prev,
              latitude: mapPickerRegion.latitude,
              longitude: mapPickerRegion.longitude,
              address: `Selected: ${coordsText}`,
            }
          : null
      );
    }
    setMapPickerVisible(false);
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
        style={[styles.placeCard, { backgroundColor: colors.cardBackground }]}
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
      animationType="slide"
      onRequestClose={() => setAddModalVisible(false)}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={() => setAddModalVisible(false)}
      >
        <Pressable
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.modalHeader, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add New Place
            </Text>
            <TouchableOpacity
              onPress={() => setAddModalVisible(false)}
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
                  Location *
                </Text>
              </View>
              <View style={styles.locationOptionsRow}>
                <TouchableOpacity
                  style={[
                    styles.locationOptionButton,
                    { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary },
                  ]}
                  onPress={getCurrentLocation}
                  disabled={isGettingLocation}
                  data-testid="button-use-current-location"
                >
                  {isGettingLocation ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="navigate" size={16} color={colors.primary} />
                      <Text style={[styles.locationOptionText, { color: colors.primary }]}>
                        Current
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.locationOptionButton,
                    { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary },
                  ]}
                  onPress={() => openMapPicker("add")}
                  data-testid="button-select-on-map"
                >
                  <Ionicons name="map" size={16} color={colors.primary} />
                  <Text style={[styles.locationOptionText, { color: colors.primary }]}>
                    Select on Map
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: useCurrentLocation
                      ? "#DCFCE7"
                      : colors.inputBackground,
                    borderColor: useCurrentLocation
                      ? "#86EFAC"
                      : colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="Or type coordinates manually..."
                placeholderTextColor={colors.textMuted}
                value={newPlace.address}
                onChangeText={(text) =>
                  setNewPlace((prev) => ({ ...prev, address: text }))
                }
                editable={!useCurrentLocation}
                data-testid="input-place-address"
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
                          newPlace.category === cat.value
                            ? colors.primary
                            : colors.surfaceSecondary,
                        borderColor:
                          newPlace.category === cat.value
                            ? colors.primary
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
                  onPress={() => Alert.alert("Coming Soon", "Custom categories will be available in a future update")}
                  data-testid="button-add-category"
                >
                  <Ionicons name="add" size={18} color={colors.textSecondary} />
                  <Text style={[styles.categoryButtonText, { color: colors.textSecondary }]}>
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
              onPress={() => setAddModalVisible(false)}
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
      </Pressable>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal
      visible={editModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setEditModalVisible(false)}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={() => setEditModalVisible(false)}
      >
        <Pressable
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.modalHeader, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
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
                              ? colors.primary
                              : colors.surfaceSecondary,
                          borderColor:
                            (editingPlace.category || "other") === cat.value
                              ? colors.primary
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
                    onPress={() => Alert.alert("Coming Soon", "Custom categories will be available in a future update")}
                    data-testid="button-add-category-edit"
                  >
                    <Ionicons name="add" size={18} color={colors.textSecondary} />
                    <Text style={[styles.categoryButtonText, { color: colors.textSecondary }]}>
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
        onPress={() => setAddModalVisible(true)}
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
        style={[styles.statCard, { backgroundColor: colors.cardBackground }]}
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
        style={[styles.statCard, { backgroundColor: colors.cardBackground }]}
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
          onPress={() => setAddModalVisible(true)}
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

      {/* Map Picker Modal */}
      <Modal
        visible={mapPickerVisible}
        animationType="slide"
        onRequestClose={() => setMapPickerVisible(false)}
      >
        <View style={[styles.mapPickerContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.mapPickerHeader, { backgroundColor: colors.headerBackground }]}>
            <TouchableOpacity
              onPress={() => setMapPickerVisible(false)}
              style={styles.mapPickerCloseButton}
              data-testid="button-close-map-picker"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.mapPickerTitle, { color: colors.text }]}>
              Select Location
            </Text>
            <TouchableOpacity
              onPress={confirmMapSelection}
              style={[styles.mapPickerConfirmButton, { backgroundColor: colors.primary }]}
              data-testid="button-confirm-map-selection"
            >
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.mapPickerConfirmText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapPickerMapContainer}>
            <MapView
              ref={mapPickerRef}
              provider={PROVIDER_GOOGLE}
              style={styles.mapPickerMap}
              initialRegion={mapPickerRegion}
              onRegionChangeComplete={setMapPickerRegion}
              showsUserLocation={true}
              showsMyLocationButton={false}
            />
            {/* Center crosshair */}
            <View style={styles.mapPickerCrosshair} pointerEvents="none">
              <View style={[styles.crosshairVertical, { backgroundColor: colors.primary }]} />
              <View style={[styles.crosshairHorizontal, { backgroundColor: colors.primary }]} />
              <View style={[styles.crosshairDot, { backgroundColor: colors.primary }]} />
            </View>
          </View>

          <View style={[styles.mapPickerFooter, { backgroundColor: colors.surface }]}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={[styles.mapPickerCoords, { color: colors.text }]}>
              {mapPickerRegion.latitude.toFixed(6)}, {mapPickerRegion.longitude.toFixed(6)}
            </Text>
          </View>
        </View>
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
    flex: 1,
    backgroundColor: "transparent",
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
  locationOptionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  locationOptionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  locationOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  mapPickerContainer: {
    flex: 1,
  },
  mapPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
  },
  mapPickerCloseButton: {
    padding: 8,
  },
  mapPickerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  mapPickerConfirmButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  mapPickerConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  mapPickerMapContainer: {
    flex: 1,
    position: "relative",
  },
  mapPickerMap: {
    flex: 1,
  },
  mapPickerCrosshair: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    alignItems: "center",
    justifyContent: "center",
  },
  crosshairVertical: {
    position: "absolute",
    width: 2,
    height: 40,
    borderRadius: 1,
  },
  crosshairHorizontal: {
    position: "absolute",
    width: 40,
    height: 2,
    borderRadius: 1,
  },
  crosshairDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mapPickerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
    paddingBottom: 40,
  },
  mapPickerCoords: {
    fontSize: 14,
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
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
});
