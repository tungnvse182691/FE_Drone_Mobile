import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '../design-tokens';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  color?: string;
}

const STARS = [1, 2, 3, 4, 5];

export function StarRating({ value, onChange, size = 40, color = colors.primary }: StarRatingProps) {
  const interactive = typeof onChange === 'function';
  const filledCount = Math.round(value);

  return (
    <View style={styles.row}>
      {STARS.map((star) => {
        const filled = star <= filledCount;
        const icon = (
          <MaterialIcons
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? color : colors.border}
          />
        );

        if (!interactive) {
          return (
            <View key={star} accessibilityLabel={`${filledCount} trên 5 sao`}>
              {icon}
            </View>
          );
        }

        return (
          <Pressable
            key={star}
            onPress={() => onChange?.(star)}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel={`${star} sao`}
            testID={`star-${star}`}
          >
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
