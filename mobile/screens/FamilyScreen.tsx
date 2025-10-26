import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Clipboard,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/contexts/AuthContext";
import { apiRequest } from "../src/lib/queryClient";
import { User, InvitationCode } from "../../shared/schema";
import AlertDialog from "../components/AlertDialog";

interface FamilyScreenProps {
  onNavigateToMap?: (location: {
    latitude: number;
    longitude: number;
    userId: number;
  }) => void;
}

export default function FamilyScreen({ onNavigateToMap }: FamilyScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  // Alert dialog states
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    buttons?: Array<{
      text: string;
      onPress?: () => void;
      style?: "default" | "cancel" | "destructive";
    }>;
  }>({ visible: false });

  // Fetch family members
  const { data: familyMembers = [], isLoading: familyLoading } = useQuery<
    User[]
  >({
    queryKey: ["/api/family"],
    enabled: !!user,
    retry: 1,
  });

  // Fetch invitation codes
  const { data: invitationCodes = [], isLoading: codesLoading } = useQuery<
    InvitationCode[]
  >({
    queryKey: ["/api/family/codes"],
    enabled: !!user,
    retry: 1,
  });

  // Fetch family locations for status
  const { data: familyLocations = [] } = useQuery<
    Array<{
      user: User;
      latitude: number;
      longitude: number;
      timestamp: Date | null;
    }>
  >({
    queryKey: ["/api/locations/family"],
    enabled: !!user,
  });

  // Generate invitation code mutation
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/family/generate-code");
      return await res.json();
    },
    onSuccess: (data) => {
      setGeneratedCode(data.code);
      setCodeDialogOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/family/codes"] });
    },
    onError: () => {
      setAlertConfig({
        visible: true,
        title: "Error",
        message: "Failed to generate invitation code",
        icon: "alert-circle",
        iconColor: "#FF3B30",
        buttons: [{ text: "OK" }],
      });
    },
  });

  // Join family mutation
  const joinFamilyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/family/join", { code });
      return await res.json();
    },
    onSuccess: () => {
      setAlertConfig({
        visible: true,
        title: "Success!",
        message: "You have successfully joined the family",
        icon: "checkmark-circle",
        iconColor: "#10B981",
        buttons: [{ text: "OK" }],
      });
      setJoinDialogOpen(false);
      setJoinCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
    },
    onError: (error: Error) => {
      setAlertConfig({
        visible: true,
        title: "Error",
        message: error.message || "Failed to join family",
        icon: "alert-circle",
        iconColor: "#FF3B30",
        buttons: [{ text: "OK" }],
      });
    },
  });

  // Remove family member mutation
  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/family/${memberId}`);
    },
    onSuccess: () => {
      setAlertConfig({
        visible: true,
        title: "Member removed",
        message: "Family member has been removed successfully",
        icon: "checkmark-circle",
        iconColor: "#10B981",
        buttons: [{ text: "OK" }],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations/family"] });
    },
    onError: () => {
      setAlertConfig({
        visible: true,
        title: "Error",
        message: "Failed to remove family member",
        icon: "alert-circle",
        iconColor: "#FF3B30",
        buttons: [{ text: "OK" }],
      });
    },
  });

  const copyToClipboard = (code: string) => {
    Clipboard.setString(code);
    setAlertConfig({
      visible: true,
      title: "Copied!",
      message: "Invitation code copied to clipboard",
      icon: "clipboard",
      iconColor: "#0EA5E9",
      buttons: [{ text: "OK" }],
    });
  };

  const handleRemove = (memberId: string, memberName: string) => {
    setAlertConfig({
      visible: true,
      title: "Remove Family Member",
      message: `Are you sure you want to remove ${memberName}?`,
      icon: "person-remove",
      iconColor: "#FF3B30",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeMutation.mutate(memberId),
        },
      ],
    });
  };

  const handleViewLocation = (member: User) => {
    const locationData = familyLocations.find(
      (loc: any) => loc.user?.id === member.id
    );

    if (locationData && onNavigateToMap) {
      onNavigateToMap({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        userId: member.id,
      });
      setAlertConfig({
        visible: true,
        title: "Navigating to map",
        message: `Centering on ${member.firstName || member.email}'s location`,
        icon: "navigate",
        iconColor: "#0EA5E9",
        buttons: [{ text: "OK" }],
      });
    }
  };

  const formatExpiration = (expiresAt: Date) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const hoursLeft = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    if (hoursLeft <= 0) return "Expired";
    if (hoursLeft === 1) return "Expires in 1 hour";
    return `Expires in ${hoursLeft} hours`;
  };

  const getStatusInfo = (member: User) => {
    const locationData = familyLocations.find(
      (loc: any) => loc.user?.id === member.id
    );

    if (!locationData || !member.locationSharingEnabled) {
      return {
        color: "#9CA3AF",
        status: "Unknown",
        message: "Location sharing disabled",
      };
    }

    const now = new Date();
    const diff = now.getTime() - new Date(locationData.timestamp!).getTime();
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 5) {
      return {
        color: "#10B981",
        status: "Active",
        message: "Currently active",
      };
    } else if (minutes < 15) {
      return {
        color: "#F59E0B",
        status: "Recent",
        message: `${minutes} min ago`,
      };
    } else if (minutes < 60) {
      return {
        color: "#F97316",
        status: "Inactive",
        message: `Inactive for ${minutes} min`,
      };
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return {
        color: "#EF4444",
        status: "Offline",
        message: `Offline for ${hours}h`,
      };
    } else {
      const days = Math.floor(minutes / 1440);
      return {
        color: "#6B7280",
        status: "Offline",
        message: `Offline for ${days}d`,
      };
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Ionicons name="people" size={24} color="#333" />
            <Text style={styles.headerText}>Family Members</Text>
          </View>
          <Text style={styles.subtitle}>
            Manage your family connections and location sharing
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => generateCodeMutation.mutate()}
            disabled={generateCodeMutation.isPending}
            data-testid="button-generate-code"
          >
            <Ionicons name="qr-code-outline" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>
              {generateCodeMutation.isPending
                ? "Generating..."
                : "Generate Code"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => setJoinDialogOpen(true)}
            data-testid="button-join-family"
          >
            <Ionicons name="key-outline" size={18} color="#0EA5E9" />
            <Text style={styles.secondaryButtonText}>Join Family</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {familyLoading ? (
          // Loading skeletons
          <View style={styles.skeletonsContainer}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonAvatar} />
                <View style={styles.skeletonContent}>
                  <View
                    style={[styles.skeletonLine, styles.skeletonLineWide]}
                  />
                  <View
                    style={[styles.skeletonLine, styles.skeletonLineNarrow]}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : familyMembers.length === 0 ? (
          // Empty state
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No family members yet</Text>
            <Text style={styles.emptyDescription}>
              Generate an invitation code to invite family members, or join
              using someone else's code.
            </Text>
            <View style={styles.emptyButtons}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={() => generateCodeMutation.mutate()}
                data-testid="button-generate-code-empty"
              >
                <Ionicons name="qr-code-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Generate Code</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setJoinDialogOpen(true)}
                data-testid="button-join-family-empty"
              >
                <Ionicons name="key-outline" size={18} color="#0EA5E9" />
                <Text style={styles.secondaryButtonText}>Join Family</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Active Invitation Codes Section */}
            {invitationCodes.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="ticket-outline" size={20} color="#6B7280" />
                  <Text style={styles.sectionTitle}>
                    Active Invitation Codes
                  </Text>
                </View>
                {invitationCodes.map((code) => (
                  <View
                    key={code.id}
                    style={styles.codeCard}
                    data-testid={`card-code-${code.code}`}
                  >
                    <View style={styles.codeCardContent}>
                      <View style={styles.codeInfo}>
                        <Text style={styles.codeValue}>{code.code}</Text>
                        <Text style={styles.codeExpiry}>
                          {formatExpiration(code.expiresAt)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.copyButton}
                        onPress={() => copyToClipboard(code.code)}
                        data-testid={`button-copy-${code.code}`}
                      >
                        <Ionicons
                          name="copy-outline"
                          size={20}
                          color="#0EA5E9"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Family members list */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={20} color="#6B7280" />
                <Text style={styles.sectionTitle}>Family Members</Text>
              </View>
              {/* Logged-in user */}
              {user && (
                <View
                  style={styles.memberCard}
                  data-testid={`card-member-${user.id}`}
                >
                  <View style={styles.memberInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {user.firstName && user.lastName
                          ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                          : user.firstName
                            ? user.firstName[0].toUpperCase()
                            : user.email?.[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberDetails}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberName}>
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.firstName || user.email}
                        </Text>
                        <View style={styles.youBadge}>
                          <Text style={styles.youBadgeText}>You</Text>
                        </View>
                      </View>
                      <View style={styles.statusRow}>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: "#10B981" },
                          ]}
                        />
                        <Text style={styles.statusText}>
                          Active: Currently active
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.memberActions}>
                    <View style={styles.actionButtonDisabled}>
                      <Text style={styles.actionButtonTextDisabled}>You</Text>
                    </View>
                  </View>
                </View>
              )}
              {familyMembers.map((member) => {
                const statusInfo = getStatusInfo(member);
                const locationData = familyLocations.find(
                  (loc: any) => loc.user?.id === member.id
                );
                const canViewLocation =
                  locationData && member.locationSharingEnabled;
                const memberName =
                  member.firstName && member.lastName
                    ? `${member.firstName} ${member.lastName}`
                    : member.firstName || member.email;

                return (
                  <View
                    key={member.id}
                    style={styles.memberCard}
                    data-testid={`card-member-${member.id}`}
                  >
                    <View style={styles.memberInfo}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {member.firstName && member.lastName
                            ? `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
                            : member.firstName
                              ? member.firstName[0].toUpperCase()
                              : member.email?.[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.memberDetails}>
                        <Text style={styles.memberName}>{memberName}</Text>
                        <View style={styles.statusRow}>
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: statusInfo.color },
                            ]}
                          />
                          <Text style={styles.statusText}>
                            {statusInfo.status}: {statusInfo.message}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.memberActions}>
                      {canViewLocation ? (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleViewLocation(member)}
                          data-testid={`button-view-location-${member.id}`}
                        >
                          <Ionicons name="location" size={16} color="#0EA5E9" />
                          <Text style={styles.actionButtonText}>View</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.actionButtonDisabled}>
                          <Ionicons name="eye-off" size={16} color="#9CA3AF" />
                          <Text style={styles.actionButtonTextDisabled}>
                            Hidden
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() =>
                          handleRemove(member.id.toString(), memberName)
                        }
                        data-testid={`button-remove-${member.id}`}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Statistics */}
            <View style={styles.statistics}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {familyMembers.length + 1}
                </Text>
                <Text style={styles.statLabel}>Total Members</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumberOnline}>
                  {1 +
                    familyLocations.filter((loc) => {
                      if (!loc.user.locationSharingEnabled || !loc.timestamp)
                        return false;
                      const now = new Date();
                      const timestamp = new Date(loc.timestamp);
                      const minutesAgo = Math.floor(
                        (now.getTime() - timestamp.getTime()) / (1000 * 60)
                      );
                      return minutesAgo < 5;
                    }).length}
                </Text>
                <Text style={styles.statLabel}>Online Now</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Generated Code Modal */}
      <Modal
        visible={codeDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCodeDialogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="qr-code" size={20} color="#333" />
                <Text style={styles.modalTitle}>Invitation Code Generated</Text>
              </View>
              <View style={styles.codeContainer}>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{generatedCode}</Text>
                </View>
                <Text style={styles.codeDescription}>
                  Share this code with family members. It expires in 24 hours.
                </Text>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.primaryButton,
                    styles.modalButton,
                  ]}
                  onPress={() => copyToClipboard(generatedCode)}
                  data-testid="button-copy-code"
                >
                  <Ionicons name="copy-outline" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Copy Code</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.secondaryButton,
                    styles.modalButton,
                  ]}
                  onPress={() => setCodeDialogOpen(false)}
                  data-testid="button-close-code-dialog"
                >
                  <Text style={styles.secondaryButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Join Family Modal */}
      <Modal
        visible={joinDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinDialogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="key" size={20} color="#333" />
                <Text style={styles.modalTitle}>Join Family</Text>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Invitation Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-character code"
                  value={joinCode}
                  onChangeText={(text) => setJoinCode(text.toUpperCase())}
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  data-testid="input-join-code"
                />
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.primaryButton,
                    styles.modalButton,
                    (joinFamilyMutation.isPending || joinCode.length !== 6) &&
                      styles.buttonDisabled,
                  ]}
                  onPress={() => joinFamilyMutation.mutate(joinCode)}
                  disabled={
                    joinFamilyMutation.isPending || joinCode.length !== 6
                  }
                  data-testid="button-submit-join"
                >
                  <Text style={styles.primaryButtonText}>
                    {joinFamilyMutation.isPending
                      ? "Joining..."
                      : "Join Family"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.secondaryButton,
                    styles.modalButton,
                  ]}
                  onPress={() => {
                    setJoinDialogOpen(false);
                    setJoinCode("");
                  }}
                  data-testid="button-cancel-join"
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Custom Alert Dialog */}
      <AlertDialog
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        buttons={alertConfig.buttons}
        onDismiss={() => setAlertConfig({ visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerContent: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  content: {
    flex: 1,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: "#0EA5E9",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#0EA5E9",
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  codeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  codeCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  codeInfo: {
    flex: 1,
  },
  codeValue: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
    color: "#0EA5E9",
    letterSpacing: 2,
    marginBottom: 4,
  },
  codeExpiry: {
    fontSize: 12,
    color: "#6B7280",
  },
  copyButton: {
    padding: 8,
  },
  skeletonsContainer: {
    padding: 16,
  },
  skeletonCard: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  skeletonLine: {
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonLineWide: {
    width: "60%",
  },
  skeletonLineNarrow: {
    width: "40%",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    marginBottom: 12,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0EA5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  memberDetails: {
    marginLeft: 12,
    flex: 1,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  youBadge: {
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: "#6B7280",
  },
  memberActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "600",
  },
  actionButtonDisabled: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonTextDisabled: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  removeButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalBlur: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  codeContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  codeBox: {
    backgroundColor: "#EFF6FF",
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#DBEAFE",
    borderStyle: "dashed",
    marginBottom: 12,
  },
  codeText: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
    color: "#3B82F6",
    letterSpacing: 4,
  },
  codeDescription: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
    textAlign: "center",
    letterSpacing: 4,
    color: "#111827",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  statistics: {
    flexDirection: "row",
    gap: 16,
    marginTop: 32,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0EA5E9",
    marginBottom: 4,
  },
  statNumberOnline: {
    fontSize: 28,
    fontWeight: "700",
    color: "#10B981",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
});
