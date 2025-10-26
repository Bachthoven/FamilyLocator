import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../src/lib/queryClient";

interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  // Get unread notification count for the red dot
  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 5000, // Check every 5 seconds for faster updates
  });

  const unreadCount = unreadCountData?.count || 0;

  // Get notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 10000, // Refresh every 10 seconds
    refetchOnWindowFocus: true,
  });

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications/unread-count"],
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest("PATCH", "/api/notifications/mark-all-read");
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications/unread-count"],
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getNotificationIcon = (title: string, type: string) => {
    const titleStr = title.toLowerCase();

    // Geofence notifications
    if (titleStr.includes("entered")) {
      return { name: "enter" as const, color: "#34C759" };
    }
    if (titleStr.includes("exited")) {
      return { name: "exit" as const, color: "#FF9500" };
    }

    // Success notifications
    if (
      titleStr.includes("success") ||
      titleStr.includes("saved") ||
      titleStr.includes("added") ||
      titleStr.includes("joined")
    ) {
      return { name: "checkmark-circle" as const, color: "#34C759" };
    }

    // Error notifications
    if (titleStr.includes("error") || titleStr.includes("failed")) {
      return { name: "close-circle" as const, color: "#FF3B30" };
    }

    // Warning notifications
    if (titleStr.includes("warning") || titleStr.includes("expired")) {
      return { name: "warning" as const, color: "#FFCC00" };
    }

    // Location notifications
    if (
      titleStr.includes("location") ||
      titleStr.includes("family") ||
      titleStr.includes("member")
    ) {
      return { name: "people" as const, color: "#20D0FF" };
    }

    // Default info icon
    return { name: "information-circle" as const, color: "#20D0FF" };
  };

  return (
    <>
      {/* Bell Button */}
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={styles.bellButton}
        activeOpacity={0.7}
        data-testid="button-notifications"
      >
        <View style={styles.bellBlur}>
          <Ionicons name="notifications" size={20} color="#fff" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Notifications Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} style={styles.blurOverlay}>
            <TouchableOpacity
              style={styles.closeOverlay}
              activeOpacity={1}
              onPress={() => setIsOpen(false)}
            />
          </BlurView>

          <View
            style={[
              styles.modalContainer,
              { paddingBottom: insets.bottom + 16 },
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Notifications</Text>
                {notifications.length > 0 && (
                  <Text style={styles.modalSubtitle}>
                    {unreadCount > 0 ? `${unreadCount} new` : "All caught up"}
                  </Text>
                )}
              </View>
              <View style={styles.headerButtons}>
                {notifications.length > 0 && unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={handleMarkAllAsRead}
                    style={styles.markAllButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.markAllText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setIsOpen(false)}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Notifications List */}
            <ScrollView style={styles.notificationsList}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#20D0FF" />
                  <Text style={styles.loadingText}>
                    Loading notifications...
                  </Text>
                </View>
              ) : notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons
                      name="notifications-outline"
                      size={48}
                      color="#9CA3AF"
                    />
                  </View>
                  <Text style={styles.emptyTitle}>No notifications yet</Text>
                  <Text style={styles.emptyDescription}>
                    You'll see location alerts and updates here
                  </Text>
                </View>
              ) : (
                <View style={styles.notificationsContainer}>
                  {notifications.map((notification) => {
                    const icon = getNotificationIcon(
                      notification.title,
                      notification.type
                    );
                    const isUnread = !notification.isRead;

                    return (
                      <TouchableOpacity
                        key={notification.id}
                        onPress={() =>
                          isUnread && handleMarkAsRead(notification.id)
                        }
                        style={[
                          styles.notificationItem,
                          isUnread && styles.notificationItemUnread,
                        ]}
                        activeOpacity={0.7}
                        data-testid={`notification-item-${notification.id}`}
                      >
                        {/* Unread indicator dot */}
                        {isUnread && <View style={styles.unreadDot} />}

                        {/* Icon */}
                        <View style={styles.notificationIcon}>
                          <Ionicons
                            name={icon.name}
                            size={20}
                            color={icon.color}
                          />
                        </View>

                        {/* Content */}
                        <View style={styles.notificationContent}>
                          <Text
                            style={[
                              styles.notificationTitle,
                              isUnread && styles.notificationTitleUnread,
                            ]}
                          >
                            {notification.title}
                          </Text>
                          <Text
                            style={[
                              styles.notificationMessage,
                              isUnread && styles.notificationMessageUnread,
                            ]}
                          >
                            {notification.message}
                          </Text>
                          <Text style={styles.notificationTime}>
                            {formatTime(
                              notification.createdAt || new Date().toISOString()
                            )}
                          </Text>
                        </View>

                        {/* Mark as read button (only for unread) */}
                        {isUnread && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            style={styles.markReadButton}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="close" size={16} color="#666" />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bellBlur: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#20D0FF",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  closeOverlay: {
    flex: 1,
  },
  modalContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#20D0FF",
    borderRadius: 8,
  },
  markAllText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationsList: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#666",
  },
  loadingIndicator: {
    color: "#20D0FF",
  },
  emptyState: {
    padding: 60,
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  notificationsContainer: {
    padding: 12,
    gap: 12,
  },
  notificationItem: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#E5E5EA",
    position: "relative",
  },
  notificationItemUnread: {
    backgroundColor: "#EBF5FF",
    borderLeftColor: "#20D0FF",
    borderWidth: 1,
    borderColor: "#20D0FF",
  },
  unreadDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
  },
  notificationIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  notificationTitleUnread: {
    color: "#000",
    fontWeight: "bold",
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  notificationMessageUnread: {
    color: "#333",
    fontWeight: "500",
  },
  notificationTime: {
    fontSize: 12,
    color: "#999",
  },
  markReadButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
