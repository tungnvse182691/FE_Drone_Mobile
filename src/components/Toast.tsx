import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../design-tokens';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  duration?: number;
}

const typeColors: Record<ToastType, string> = {
  success: colors.success,
  error: colors.error,
  info: colors.info,
};

export function Toast({ type, message, duration = 3000 }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -16, duration: 200, useNativeDriver: true }),
      ]).start();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { borderLeftColor: typeColors[type], opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: typeColors[type] }]} />
      <Text style={[typography.bodyMd, styles.message]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.screenMargin,
    right: spacing.screenMargin,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    marginRight: spacing.sm,
  },
  message: {
    color: colors.onSurface,
    flex: 1,
  },
});