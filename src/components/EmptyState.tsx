import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { colors, spacing, typography } from '../design-tokens';
import { Button } from './Button';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <MaterialIcons name={icon} size={48} color={colors.secondary} />
      <Text style={[typography.titleMd, styles.title]}>{title}</Text>
      <Text style={[typography.bodyMd, styles.message]}>{message}</Text>
      {actionLabel && onAction ? <Button variant="secondary" title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.neutral,
    textAlign: 'center',
  },
  message: {
    color: colors.secondary,
    textAlign: 'center',
  },
});