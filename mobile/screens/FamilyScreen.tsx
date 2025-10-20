import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Clipboard,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/contexts/AuthContext";
import { apiRequest } from "../src/lib/queryClient";
import { User, InvitationCode } from "../../shared/schema";

export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  // Fetch family members
  const { data: familyMembers = [], isLoading: familyLoading } = useQuery<
    User[]
  >({
    queryKey: ["/api/family"],
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
    onError: (error: Error) => {
      Alert.alert("Error", "Failed to generate invitation code");
    },
  });

  // Join family mutation
  const joinFamilyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/family/join", { code });
      return await res.json();
    },
    onSuccess: () => {
      Alert.alert("Success!", "You have successfully joined the family");
      setJoinDialogOpen(false);
      setJoinCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to join family");
    },
  });

  // Remove family member mutation
  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/family/${memberId}`);
    },
    onSuccess: () => {
      Alert.alert(
        "Member removed",
        "Family member has been removed successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
    },
    onError: () => {
      Alert.alert("Error", "Failed to remove family member");
    },
  });

  const copyToClipboard = (code: string) => {
    Clipboard.setString(code);
    Alert.alert("Copied!", "Invitation code copied to clipboard");
  };

  const handleRemove = (memberId: string) => {
    Alert.alert(
      "Remove Family Member",
      "Are you sure you want to remove this family member?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeMutation.mutate(memberId),
        },
      ]
    );
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
            <Ionicons name="key-outline" size={18} color="#3B82F6" />
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
                <Ionicons name="key-outline" size={18} color="#3B82F6" />
                <Text style={styles.secondaryButtonText}>Join Family</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Family members list
          <View style={styles.membersList}>
            {familyMembers.map((member) => {
              const statusInfo = getStatusInfo(member);
              const locationData = familyLocations.find(
                (loc: any) => loc.user?.id === member.id
              );
              const canViewLocation =
                locationData && member.locationSharingEnabled;

              return (
                <View
                  key={member.id}
                  style={styles.memberCard}
                  data-testid={`card-member-${member.id}`}
                >
                  <View style={styles.memberInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {member.firstName
                          ? member.firstName[0].toUpperCase()
                          : member.email?.[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberDetails}>
                      <Text style={styles.memberName}>
                        {member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.firstName || member.email}
                      </Text>
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
                        data-testid={`button-view-location-${member.id}`}
                      >
                        <Ionicons name="location" size={16} color="#3B82F6" />
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
                  </View>
                </View>
              );
            })}
          </View>
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
    backgroundColor: "#3B82F6",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "600",
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
  membersList: {
    padding: 16,
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
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
  },
  memberDetails: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
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
});
