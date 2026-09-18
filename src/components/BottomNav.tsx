import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { colors, typography } from '../design-tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface NavTab {
  icon: IconName;
  label: string;
  route: string;
  activePrefixes?: string[];
}

interface BottomNavProps {
  tabs: NavTab[];
  activeRoute: string;
}

function matchLength(tab: NavTab, activeRoute: string) {
  const prefixes = tab.activePrefixes ?? [tab.route];
  return prefixes.reduce(
    (best, prefix) => (activeRoute.startsWith(prefix) ? Math.max(best, prefix.length) : best),
    -1,
  );
}

export function BottomNav({ tabs, activeRoute }: BottomNavProps) {
  const matchLengths = tabs.map((tab) => matchLength(tab, activeRoute));
  const longestMatch = Math.max(...matchLengths);
  const activeIndex = longestMatch < 0 ? -1 : matchLengths.indexOf(longestMatch);

  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <Pressable
            key={tab.route}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => router.push(tab.route)}
          >
            <Ionicons name={tab.icon} size={22} color={isActive ? colors.primary : colors.secondary} />
            <Text style={[typography.labelSm, { color: isActive ? colors.primary : colors.secondary }]}>
              {tab.label.toUpperCase()}
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
    height: 64,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});