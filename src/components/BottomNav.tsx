import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { colors, typography } from '../design-tokens';

type MatIconName = ComponentProps<typeof MaterialIcons>['name'];

export interface NavTab {
  icon: MatIconName | string;
  iconFamily?: 'material';
  label: string;
  route: string;
  activePrefixes?: string[];
}

interface BottomNavProps {
  tabs: NavTab[];
  activeRoute: string;
  onNavigate?: (route: string) => void;
}

function matchLength(tab: NavTab, activeRoute: string) {
  const prefixes = tab.activePrefixes ?? [tab.route];
  return prefixes.reduce(
    (best, prefix) => (activeRoute.startsWith(prefix) ? Math.max(best, prefix.length) : best),
    -1,
  );
}

export function BottomNav({ tabs, activeRoute, onNavigate }: BottomNavProps) {
  const matchLengths = tabs.map((tab) => matchLength(tab, activeRoute));
  const longestMatch = Math.max(...matchLengths);
  const activeIndex = longestMatch < 0 ? -1 : matchLengths.indexOf(longestMatch);

  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        const iconColor = isActive ? colors.primary : colors.secondary;
        return (
          <Pressable
            key={tab.route}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onNavigate ? onNavigate(tab.route) : router.push(tab.route)}
          >
            <View style={[styles.iconContainer, isActive && styles.activeIcon]}>
              <MaterialIcons name={tab.icon as any} size={22} color={iconColor} />
            </View>
            <Text style={[typography.labelSm, styles.label, { color: iconColor }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    minHeight: 64,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: { textAlign: 'center', flexShrink: 1 },
  iconContainer: { width: 44, minHeight: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  activeIcon: { backgroundColor: `${colors.primary}18` },
});
