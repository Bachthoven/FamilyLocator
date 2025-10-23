import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface AlertDialogProps {
  visible: boolean;
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

export default function AlertDialog({
  visible,
  title,
  message,
  icon,
  iconColor = "#1d89f1",
  buttons = [{ text: "OK", style: "default" }],
  onDismiss,
}: AlertDialogProps) {
  const handleButtonPress = (button: AlertButton) => {
    button.onPress?.();
    onDismiss?.();
  };

  const handleBackdropPress = () => {
    // Only dismiss if there's a cancel button
    const hasCancelButton = buttons.some((b) => b.style === "cancel");
    if (hasCancelButton) {
      onDismiss?.();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={handleBackdropPress}>
        <Pressable
          style={styles.container}
          onPress={(e) => e.stopPropagation()}
        >
          {icon && (
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: iconColor + "15" },
              ]}
            >
              <Ionicons name={icon} size={32} color={iconColor} />
            </View>
          )}
          {title && <Text style={styles.title}>{title}</Text>}
          {message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === "destructive" && styles.buttonDestructive,
                  button.style === "cancel" && styles.buttonCancel,
                  buttons.length === 1 && styles.buttonSingle,
                ]}
                onPress={() => handleButtonPress(button)}
                activeOpacity={0.7}
                data-testid={`button-alert-${button.text.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === "destructive" &&
                      styles.buttonTextDestructive,
                    button.style === "cancel" && styles.buttonTextCancel,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: "#1d89f1",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonSingle: {
    flex: 0,
    minWidth: 120,
    alignSelf: "center",
  },
  buttonCancel: {
    backgroundColor: "#F5F5F5",
  },
  buttonDestructive: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  buttonTextCancel: {
    color: "#666",
  },
  buttonTextDestructive: {
    color: "#fff",
  },
});
