import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../design-tokens';

type ChipVariant =
  | 'severity-high'
  | 'severity-medium'
  | 'severity-low'
  | 'status-pending'
  | 'approved'
  | 'rejected';

interface ChipProps {
  variant: ChipVariant;
  label: string;
}

const variantColors: Record<ChipVariant, { backgroundColor: string; textColor: string }> = {
  'severity-high': { backgroundColor: '#FDECEC', textColor: colors.error },
  'severity-medium': { backgroundColor: '#FEF3E2', textColor: colors.warning },
  'severity-low': { backgroundColor: '#E9F7EC', textColor: colors.success },
  'status-pending': { backgroundColor: colors.surfaceAlt, textColor: colors.secondary },
  approved: { backgroundColor: colors.surfaceAlt, textColor: colors.success },
  rejected: { backgroundColor: colors.surfaceAlt, textColor: colors.error },
};

export function Chip({ variant, label }: ChipProps) {
  const { backgroundColor, textColor } = variantColors[variant];

  return (
    <View style={[styles.chip, { backgroundColor }]}>
      <Text style={[typography.labelSm, { color: textColor }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
});