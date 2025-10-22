import React, { useEffect, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CompassProps {
  heading: number; // Current map heading in degrees
  onPress: () => void;
}

export default function Compass({ heading, onPress }: CompassProps) {
  const rotateAnim = useRef(new Animated.Value(heading)).current;

  useEffect(() => {
    // No animation for instant real-time updates
    rotateAnim.setValue(heading);
  }, [heading]);

  // Rotate in opposite direction to keep north pointing up
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "-360deg"],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
      data-testid="button-compass"
    >
      <Animated.View
        style={[
          styles.needleContainer,
          {
            transform: [{ rotate: rotation }],
          },
        ]}
      >
        {/* North needle (red) - pointing up */}
        <View style={styles.needleNorth} />
        {/* South needle (gray) - pointing down */}
        <View style={styles.needleSouth} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  needleContainer: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  // Red north needle (pointing up)
  needleNorth: {
    position: "absolute",
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 14,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FF3B30",
    top: 7,
  },
  // Gray south needle (pointing down, with gap at base)
  needleSouth: {
    position: "absolute",
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 14,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#666",
    bottom: 7,
  },
});
