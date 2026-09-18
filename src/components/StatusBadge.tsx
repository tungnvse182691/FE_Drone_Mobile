import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../design-tokens';
import { SyncStatus } from '../types/enums';

interface StatusBadgeProps {
  status: SyncStatus;
}

const statusColors: Record<SyncStatus, string> = {
  [SyncStatus.LOCAL]: colors.secondary,
  [SyncStatus.QUEUED]: colors.info,
  [SyncStatus.UPLOADING]: colors.info,
  [SyncStatus.SERVER_CONFIRMED]: colors.success,
  [SyncStatus.INVALID]: colors.error,
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = statusColors[status];

  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[typography.labelSm, { color }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
});