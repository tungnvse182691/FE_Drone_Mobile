import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../design-tokens';

type ButtonVariant = 'primary' | 'secondary' | 'text';

interface ButtonProps {
  variant: ButtonVariant;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  title: string;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabledStyle?: StyleProp<ViewStyle>;
  disabledTextStyle?: StyleProp<TextStyle>;
}

const baseButtonStyle = {
  borderRadius: radius.md,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  paddingVertical: 12,
  paddingHorizontal: spacing.md,
  minHeight: 48,
};

export function Button({ variant, onPress, disabled, loading, title, icon, style, disabledStyle, disabledTextStyle }: ButtonProps) {
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
        isDisabled && disabledStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : colors.secondary} />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text
            style={[
              typography.labelLg,
              variant === 'primary' && styles.primaryText,
              variant === 'secondary' && styles.secondaryText,
              variant === 'text' && styles.textLabel,
              isDisabled && styles.disabledText,
              isDisabled && disabledTextStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: baseButtonStyle,
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
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