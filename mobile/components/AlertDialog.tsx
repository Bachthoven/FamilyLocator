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
import { useThemeColors } from "../theme/colors";

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
  iconColor = "#0EA5E9",
  buttons = [{ text: "OK", style: "default" }],
  onDismiss,
}: AlertDialogProps) {
  const colors = useThemeColors();

  const handleButtonPress = (button: AlertButton) => {
    button.onPress?.();
    onDismiss?.();
  };

  const handleBackdropPress = () => {
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
          style={[
            styles.container,
            {
              backgroundColor: colors.dialogBackground,
              borderColor: colors.dialogBorder,
              borderWidth: 1,
            },
          ]}
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
          {title && (
            <Text style={[styles.title, { color: colors.dialogText }]}>
              {title}
            </Text>
          )}
          {message && (
            <Text
              style={[styles.message, { color: colors.dialogTextSecondary }]}
            >
              {message}
            </Text>
          )}
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === "destructive" && styles.buttonDestructive,
                  button.style === "cancel" && [
                    styles.buttonCancel,
                    { backgroundColor: colors.surfaceSecondary },
                  ],
                  buttons.length === 1 && styles.buttonSingle,
                ]}
                onPress={() => handleButtonPress(button)}
                activeOpacity={0.7}
                data-testid={`button-alert-${button.text.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {button.style === "cancel" && (
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={colors.textSecondary}
                    style={{ marginTop: 1 }}
                  />
                )}
                {button.style === "destructive" && (
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                )}
                <Text
                  style={[
                    styles.buttonText,
                    button.style === "destructive" &&
                      styles.buttonTextDestructive,
                    button.style === "cancel" && [
                      styles.buttonTextCancel,
                      { color: colors.textSecondary },
                    ],
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
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
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
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  button: {
    flex: 1,
    backgroundColor: "#0EA5E9",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  buttonSingle: {
    flex: 0,
    minWidth: 120,
    alignSelf: "center",
  },
  buttonCancel: {},
  buttonDestructive: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  buttonTextCancel: {},
  buttonTextDestructive: {
    color: "#fff",
  },
});
