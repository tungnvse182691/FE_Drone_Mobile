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
  activeRoutes?: string[];
  /** Legacy name used by Crew/Drone. Entries are exact routes, not prefixes. */
  activePrefixes?: string[];
}

interface BottomNavProps {
  tabs: NavTab[];
  activeRoute: string;
  onNavigate?: (route: string) => void;
}

export function BottomNav({ tabs, activeRoute, onNavigate }: BottomNavProps) {
  const activeIndex = tabs.findIndex(tab =>
    (tab.activeRoutes ?? tab.activePrefixes ?? [tab.route]).includes(activeRoute));

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
