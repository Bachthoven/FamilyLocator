import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeColors, useIsDarkMode } from "../theme/colors";
import { useAuth } from "../src/contexts/AuthContext";
import { apiRequest } from "../src/lib/queryClient";
import { useThemePreference } from "../theme/ThemeContext";

interface SettingsItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  action: () => void;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const isDarkMode = useIsDarkMode();
  const { user, logoutMutation } = useAuth();
  const queryClient = useQueryClient();
  const { themePreference, setThemePreference } = useThemePreference();

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] =
    useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [locationSettings, setLocationSettings] = useState({
    autoLocationEnabled: true,
    locationInterval: "60",
  });

  const [notificationPermission, setNotificationPermission] =
    useState<string>("default");

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [user]);

  useEffect(() => {
    loadLocationSettings();
    checkNotificationPermission();
  }, []);

  const loadLocationSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem("autoLocationEnabled");
      const interval = await AsyncStorage.getItem("autoLocationInterval");
      setLocationSettings({
        autoLocationEnabled: enabled !== "false",
        locationInterval: interval || "60",
      });
    } catch (error) {
      console.log("Error loading location settings:", error);
    }
  };

  const checkNotificationPermission = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationPermission(status);
    } catch (error) {
      console.log("Error checking notification permission:", error);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/user/profile", data);
      return response.json();
    },
    onSuccess: () => {
      Alert.alert("Success", "Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setProfileModalVisible(false);
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to update profile");
    },
  });

  const handleSaveProfile = () => {
    if (profileForm.newPassword) {
      if (!profileForm.currentPassword) {
        Alert.alert("Error", "Please enter your current password");
        return;
      }
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        Alert.alert("Error", "New passwords do not match");
        return;
      }
      if (profileForm.newPassword.length < 6) {
        Alert.alert("Error", "Password must be at least 6 characters");
        return;
      }
    }

    const updateData: any = {
      firstName: profileForm.firstName,
      lastName: profileForm.lastName,
      email: profileForm.email,
      phoneNumber: profileForm.phoneNumber,
    };

    if (profileForm.newPassword) {
      updateData.currentPassword = profileForm.currentPassword;
      updateData.newPassword = profileForm.newPassword;
    }

    updateProfileMutation.mutate(updateData);
  };

  const handleSaveLocationSettings = async () => {
    try {
      await AsyncStorage.setItem(
        "autoLocationEnabled",
        locationSettings.autoLocationEnabled.toString()
      );
      await AsyncStorage.setItem(
        "autoLocationInterval",
        locationSettings.locationInterval
      );
      Alert.alert("Success", "Location settings saved!");
      setLocationModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to save location settings");
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationPermission(status);
      if (status === "granted") {
        Alert.alert("Success", "Notifications enabled!");
      } else {
        Alert.alert(
          "Permission Denied",
          "Please enable notifications in your device settings"
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to request notification permission");
    }
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => logoutMutation.mutate(),
      },
    ]);
  };

  const getThemeLabel = () => {
    switch (themePreference) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      default:
        return "System";
    }
  };

  const settingsItems: SettingsItem[] = [
    {
      icon: "person-outline",
      label: "Profile Information",
      description: "Update your personal details",
      action: () => setProfileModalVisible(true),
    },
    {
      icon: "location-outline",
      label: "Location Settings",
      description: "Configure automatic location logging",
      action: () => setLocationModalVisible(true),
    },
    {
      icon: "notifications-outline",
      label: "Notification Settings",
      description: "Manage system notifications and alerts",
      action: () => setNotificationModalVisible(true),
    },
    {
      icon: "help-circle-outline",
      label: "Help & Support",
      description: "Get help and contact support",
      action: () =>
        Alert.alert(
          "Support Contact",
          "For support, contact: bachtoven.rules@gmail.com"
        ),
    },
  ];

  const intervalOptions = [
    { value: "15", label: "15 minutes" },
    { value: "30", label: "30 minutes" },
    { value: "60", label: "1 hour" },
    { value: "120", label: "2 hours" },
    { value: "240", label: "4 hours" },
    { value: "480", label: "8 hours" },
  ];

  if (!user) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, backgroundColor: colors.background },
        ]}
      >
        <StatusBar style={colors.statusBarStyle} />
        <View style={styles.loadingContainer}>
          <View
            style={[
              styles.loadingSkeleton,
              { backgroundColor: colors.skeletonBackground },
            ]}
          />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  const renderProfileModal = () => (
    <Modal
      visible={profileModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setProfileModalVisible(false)}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={() => setProfileModalVisible(false)}
      >
        <Pressable
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Ionicons name="person" size={20} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit Profile
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setProfileModalVisible(false)}
              data-testid="button-close-profile-modal"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.avatarContainer}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.avatarBackground },
                ]}
              >
                {user.profileImageUrl ? (
                  <Image
                    source={{ uri: user.profileImageUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={[styles.avatarText, { color: colors.text }]}>
                    {profileForm.firstName
                      ? profileForm.firstName[0].toUpperCase()
                      : profileForm.email[0].toUpperCase()}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>
                  First Name
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
                  placeholder="First name"
                  placeholderTextColor={colors.textMuted}
                  value={profileForm.firstName}
                  onChangeText={(text) =>
                    setProfileForm((prev) => ({ ...prev, firstName: text }))
                  }
                  data-testid="input-first-name"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Last Name
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
                  placeholder="Last name"
                  placeholderTextColor={colors.textMuted}
                  value={profileForm.lastName}
                  onChangeText={(text) =>
                    setProfileForm((prev) => ({ ...prev, lastName: text }))
                  }
                  data-testid="input-last-name"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={profileForm.email}
                onChangeText={(text) =>
                  setProfileForm((prev) => ({ ...prev, email: text }))
                }
                keyboardType="email-address"
                autoCapitalize="none"
                data-testid="input-email"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Phone Number
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
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.textMuted}
                value={profileForm.phoneNumber}
                onChangeText={(text) =>
                  setProfileForm((prev) => ({ ...prev, phoneNumber: text }))
                }
                keyboardType="phone-pad"
                data-testid="input-phone"
              />
            </View>

            <View style={styles.passwordSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Change Password (Optional)
              </Text>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Current Password
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
                  placeholder="Current password"
                  placeholderTextColor={colors.textMuted}
                  value={profileForm.currentPassword}
                  onChangeText={(text) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      currentPassword: text,
                    }))
                  }
                  secureTextEntry
                  data-testid="input-current-password"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  New Password
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
                  placeholder="New password"
                  placeholderTextColor={colors.textMuted}
                  value={profileForm.newPassword}
                  onChangeText={(text) =>
                    setProfileForm((prev) => ({ ...prev, newPassword: text }))
                  }
                  secureTextEntry
                  data-testid="input-new-password"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Confirm New Password
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
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textMuted}
                  value={profileForm.confirmPassword}
                  onChangeText={(text) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      confirmPassword: text,
                    }))
                  }
                  secureTextEntry
                  data-testid="input-confirm-password"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={() => setProfileModalVisible(false)}
              data-testid="button-cancel-profile"
            >
              <Ionicons name="close" size={18} color={colors.text} />
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.primary },
                updateProfileMutation.isPending && styles.buttonDisabled,
              ]}
              onPress={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderLocationModal = () => (
    <Modal
      visible={locationModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setLocationModalVisible(false)}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={() => setLocationModalVisible(false)}
      >
        <Pressable
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Location Settings
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setLocationModalVisible(false)}
              data-testid="button-close-location-modal"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View
              style={[
                styles.settingCard,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <View style={styles.settingCardHeader}>
                <Ionicons name="time" size={18} color={colors.primary} />
                <Text style={[styles.settingCardTitle, { color: colors.text }]}>
                  Automatic Location Logging
                </Text>
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text style={[styles.switchTitle, { color: colors.text }]}>
                    Enable auto-logging
                  </Text>
                  <Text
                    style={[
                      styles.switchDescription,
                      { color: colors.textMuted },
                    ]}
                  >
                    Automatically save your location at regular intervals
                  </Text>
                </View>
                <Switch
                  value={locationSettings.autoLocationEnabled}
                  onValueChange={(value) =>
                    setLocationSettings((prev) => ({
                      ...prev,
                      autoLocationEnabled: value,
                    }))
                  }
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                  data-testid="switch-auto-location"
                />
              </View>

              {locationSettings.autoLocationEnabled && (
                <View style={styles.intervalSection}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Logging interval
                  </Text>
                  <View style={styles.intervalGrid}>
                    {intervalOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.intervalButton,
                          {
                            backgroundColor:
                              locationSettings.locationInterval === option.value
                                ? colors.primary
                                : colors.surfaceSecondary,
                            borderColor:
                              locationSettings.locationInterval === option.value
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                        onPress={() =>
                          setLocationSettings((prev) => ({
                            ...prev,
                            locationInterval: option.value,
                          }))
                        }
                        data-testid={`button-interval-${option.value}`}
                      >
                        <Text
                          style={[
                            styles.intervalButtonText,
                            {
                              color:
                                locationSettings.locationInterval ===
                                option.value
                                  ? "#FFFFFF"
                                  : colors.text,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text
                    style={[styles.intervalHint, { color: colors.textMuted }]}
                  >
                    How often to automatically record your location
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={() => setLocationModalVisible(false)}
              data-testid="button-cancel-location"
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveLocationSettings}
              data-testid="button-save-location"
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderNotificationModal = () => (
    <Modal
      visible={notificationModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setNotificationModalVisible(false)}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={() => setNotificationModalVisible(false)}
      >
        <Pressable
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Ionicons name="notifications" size={20} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Notification Settings
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setNotificationModalVisible(false)}
              data-testid="button-close-notification-modal"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View
              style={[
                styles.settingCard,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <View style={styles.settingCardHeader}>
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={[styles.settingCardTitle, { color: colors.text }]}>
                  System Notifications
                </Text>
              </View>

              <Text
                style={[
                  styles.settingCardDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Get native notifications on your device when family members
                enter or exit saved locations
              </Text>

              <View
                style={[
                  styles.permissionStatus,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Ionicons
                  name={
                    notificationPermission === "granted"
                      ? "checkmark-circle"
                      : notificationPermission === "denied"
                        ? "close-circle"
                        : "alert-circle"
                  }
                  size={18}
                  color={
                    notificationPermission === "granted"
                      ? "#10B981"
                      : notificationPermission === "denied"
                        ? "#EF4444"
                        : "#6B7280"
                  }
                />
                <Text style={[styles.permissionText, { color: colors.text }]}>
                  Permission Status:{" "}
                  {notificationPermission === "granted"
                    ? "Enabled"
                    : notificationPermission === "denied"
                      ? "Blocked"
                      : "Not Set"}
                </Text>
              </View>

              {notificationPermission !== "granted" && (
                <TouchableOpacity
                  style={[
                    styles.enableNotificationsButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={requestNotificationPermission}
                  data-testid="button-enable-notifications"
                >
                  <Ionicons name="notifications" size={18} color="#FFFFFF" />
                  <Text style={styles.enableNotificationsText}>
                    Enable System Notifications
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.notificationHints}>
                <Text
                  style={[styles.notificationHint, { color: colors.textMuted }]}
                >
                  • You'll receive notifications when family members enter or
                  exit saved places
                </Text>
                <Text
                  style={[styles.notificationHint, { color: colors.textMuted }]}
                >
                  • Notifications appear even when the app is closed or
                  minimized
                </Text>
                <Text
                  style={[styles.notificationHint, { color: colors.textMuted }]}
                >
                  • You can disable this anytime in your device settings
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.fullWidthButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={() => setNotificationModalVisible(false)}
              data-testid="button-close-notification"
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderThemeModal = () => (
    <Modal
      visible={themeModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setThemeModalVisible(false)}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={() => setThemeModalVisible(false)}
      >
        <Pressable
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Ionicons name="color-palette" size={20} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Appearance
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setThemeModalVisible(false)}
              data-testid="button-close-theme-modal"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text
              style={[styles.themeDescription, { color: colors.textSecondary }]}
            >
              Choose your preferred appearance mode
            </Text>

            {[
              { value: "light", icon: "sunny", label: "Light" },
              { value: "dark", icon: "moon", label: "Dark" },
              { value: "system", icon: "phone-portrait", label: "System" },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor:
                      themePreference === option.value
                        ? colors.primary + "20"
                        : colors.cardBackground,
                    borderColor:
                      themePreference === option.value
                        ? colors.primary
                        : colors.border,
                  },
                ]}
                onPress={() => {
                  setThemePreference(option.value as any);
                  setThemeModalVisible(false);
                }}
                data-testid={`button-theme-${option.value}`}
              >
                <View
                  style={[
                    styles.themeOptionIcon,
                    {
                      backgroundColor:
                        themePreference === option.value
                          ? colors.primary
                          : colors.surfaceSecondary,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={
                      themePreference === option.value
                        ? "#FFFFFF"
                        : colors.textSecondary
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.themeOptionLabel,
                    {
                      color:
                        themePreference === option.value
                          ? colors.primary
                          : colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {themePreference === option.value && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.primary}
                    style={styles.themeCheckmark}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
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
        <View style={styles.headerTitleRow}>
          <Ionicons name="settings" size={24} color={colors.text} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Settings
          </Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          Manage your account and app preferences
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.cardBackground },
          ]}
          data-testid="card-profile"
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.avatarBackground },
            ]}
          >
            {user.profileImageUrl ? (
              <Image
                source={{ uri: user.profileImageUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={[styles.avatarText, { color: colors.text }]}>
                {user.firstName
                  ? user.firstName[0].toUpperCase()
                  : user.email?.[0].toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.firstName || user.email}
            </Text>
            <Text
              style={[styles.profileEmail, { color: colors.textSecondary }]}
            >
              {user.email}
            </Text>
            <View
              style={[
                styles.locationBadge,
                {
                  backgroundColor: user.locationSharingEnabled
                    ? "#D1FAE5"
                    : colors.surfaceSecondary,
                },
              ]}
            >
              <Text
                style={[
                  styles.locationBadgeText,
                  {
                    color: user.locationSharingEnabled
                      ? "#059669"
                      : colors.textMuted,
                  },
                ]}
              >
                {user.locationSharingEnabled
                  ? "Location Sharing On"
                  : "Location Sharing Off"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.settingsList}>
          {settingsItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.settingsItem,
                { backgroundColor: colors.cardBackground },
              ]}
              onPress={item.action}
              data-testid={`button-setting-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <View
                style={[
                  styles.settingsItemIcon,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name={item.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.settingsItemContent}>
                <Text
                  style={[styles.settingsItemLabel, { color: colors.text }]}
                >
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.settingsItemDescription,
                    { color: colors.textMuted },
                  ]}
                >
                  {item.description}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[
              styles.settingsItem,
              { backgroundColor: colors.cardBackground },
            ]}
            onPress={() => setThemeModalVisible(true)}
            data-testid="button-setting-appearance"
          >
            <View
              style={[
                styles.settingsItemIcon,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons name="color-palette" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingsItemContent}>
              <Text style={[styles.settingsItemLabel, { color: colors.text }]}>
                Appearance
              </Text>
              <Text
                style={[
                  styles.settingsItemDescription,
                  { color: colors.textMuted },
                ]}
              >
                {getThemeLabel()} theme
              </Text>
            </View>
            <View style={styles.themePreview}>
              <Ionicons
                name={
                  themePreference === "dark"
                    ? "moon"
                    : themePreference === "light"
                      ? "sunny"
                      : "phone-portrait"
                }
                size={18}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          data-testid="button-logout"
        >
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.appInfo}>
          <Text style={[styles.appVersion, { color: colors.textMuted }]}>
            FamilyLocator v1.0.0
          </Text>
          <Text style={[styles.appTagline, { color: colors.textMuted }]}>
            Stay connected, stay safe
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {renderProfileModal()}
      {renderLocationModal()}
      {renderNotificationModal()}
      {renderThemeModal()}
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
  loadingSkeleton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    marginLeft: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "600",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  locationBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  locationBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  settingsList: {
    gap: 8,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
  },
  settingsItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingsItemLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingsItemDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  themePreview: {
    marginRight: 4,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  appInfo: {
    alignItems: "center",
    marginTop: 32,
  },
  appVersion: {
    fontSize: 14,
  },
  appTagline: {
    fontSize: 12,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalScroll: {
    padding: 16,
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  passwordSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    gap: 6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  fullWidthButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
  },
  settingCard: {
    padding: 16,
    borderRadius: 12,
  },
  settingCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  settingCardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  settingCardDescription: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  switchLabel: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  switchDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  intervalSection: {
    marginTop: 8,
  },
  intervalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  intervalButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  intervalButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  intervalHint: {
    fontSize: 12,
    marginTop: 12,
  },
  permissionStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  enableNotificationsButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  enableNotificationsText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  notificationHints: {
    gap: 6,
  },
  notificationHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  themeDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  themeOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  themeOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  themeOptionLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 12,
    flex: 1,
  },
  themeCheckmark: {
    marginLeft: "auto",
  },
});
