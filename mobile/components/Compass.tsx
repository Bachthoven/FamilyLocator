import React, { useEffect, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { useThemeColors } from "../theme/colors";

interface CompassProps {
  heading: number;
  onPress: () => void;
}

export default function Compass({ heading, onPress }: CompassProps) {
  const colors = useThemeColors();
  const rotateAnim = useRef(new Animated.Value(heading)).current;

  useEffect(() => {
    rotateAnim.setValue(heading);
  }, [heading]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "-360deg"],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.compassBackground,
          borderColor: colors.border,
        },
      ]}
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
        <View
          style={[
            styles.needleNorth,
            { borderBottomColor: colors.compassNorth },
          ]}
        />
        <View
          style={[styles.needleSouth, { borderTopColor: colors.compassSouth }]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
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
  needleNorth: {
    position: "absolute",
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 15,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    top: 0,
  },
  needleSouth: {
    position: "absolute",
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 15,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    bottom: 0,
  },
});
