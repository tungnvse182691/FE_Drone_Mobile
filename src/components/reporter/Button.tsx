import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../design-tokens';

interface Props {
  variant: 'primary' | 'secondary' | 'text'; title: string; onPress: () => void;
  disabled?: boolean; loading?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle>;
  disabledStyle?: StyleProp<ViewStyle>; disabledTextStyle?: StyleProp<TextStyle>;
  progressPercent?: number;
}
/** Reporter-only contrast and wrapping; shared Crew/Operator buttons stay independent. */
export function Button({ variant, title, onPress, disabled, loading, icon, style, disabledStyle, disabledTextStyle, progressPercent }: Props) {
  const blocked = !!disabled || !!loading;
  const percent = Number.isFinite(progressPercent) ? Math.max(0, Math.min(100, Math.floor(progressPercent!))) : undefined;
  return <Pressable accessibilityRole="button" accessibilityLabel={title}
    accessibilityState={{ disabled: blocked, busy: !!loading }} disabled={blocked} onPress={onPress}
    style={({ pressed }) => [styles.base, styles[variant], pressed && !blocked && styles.pressed,
      disabled && styles.disabled, disabled && disabledStyle, style]}>
    <View style={styles.content}>{icon}
      <Text style={[typography.labelLg, styles.label, disabled && disabledTextStyle]}>{title}</Text>
      {loading ? percent === undefined ? <ActivityIndicator size="small" color={colors.neutral} /> :
        <View accessibilityRole="progressbar" accessibilityLabel="Tiến độ tải ảnh"
          accessibilityValue={{ min: 0, max: 100, now: percent }} style={styles.progressRing}>
          {Array.from({ length: 32 }, (_, index) => <View key={index} style={[styles.progressSegment,
            { opacity: index < Math.floor(percent * 32 / 100) ? 1 : 0.18,
              transform: [{ rotate: `${index * 360 / 32}deg` }, { translateY: -16 }] }]} />)}
          <Text style={styles.progressNumber}>{percent}%</Text>
        </View> : null}
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  base: { minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: 14, borderRadius: radius.lg, justifyContent: 'center' },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  text: { backgroundColor: 'transparent' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { color: colors.neutral, textAlign: 'center', flexShrink: 1, lineHeight: 21 },
  pressed: { opacity: 0.8 }, disabled: { opacity: 0.5 },
  progressRing: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  progressSegment: { position: 'absolute', width: 2, height: 4, borderRadius: 1, backgroundColor: colors.neutral },
  progressNumber: { ...typography.labelSm, fontSize: 10, lineHeight: 14, color: colors.neutral },
});
