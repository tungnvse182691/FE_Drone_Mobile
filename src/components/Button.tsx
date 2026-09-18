import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, typography } from '../design-tokens';

type ButtonVariant = 'primary' | 'secondary' | 'text';

interface ButtonProps {
  variant: ButtonVariant;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  title: string;
}

const baseButtonStyle = {
  borderRadius: radius.md,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  paddingVertical: 12,
  paddingHorizontal: spacing.md,
  minHeight: 48,
};

export function Button({ variant, onPress, disabled, loading, title }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && [styles.primary, pressed && !isDisabled && styles.primaryPressed],
        variant === 'secondary' && [styles.secondary, pressed && !isDisabled && styles.secondaryPressed],
        variant === 'text' && styles.text,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : colors.secondary} />
      ) : (
        <Text
          style={[
            typography.labelLg,
            variant === 'primary' && styles.primaryText,
            variant === 'secondary' && styles.secondaryText,
            variant === 'text' && styles.textLabel,
            isDisabled && styles.disabledText,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: baseButtonStyle,
  primary: { backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryDark },
  primaryText: { color: colors.onPrimary },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.secondary },
  secondaryPressed: { backgroundColor: colors.surfaceAlt },
  secondaryText: { color: colors.neutral },
  text: { backgroundColor: 'transparent' },
  textLabel: { color: colors.secondary },
  disabled: { opacity: 0.5 },
  disabledText: { color: colors.secondary },
});