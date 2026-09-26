import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { colors, typography } from '../design-tokens';

type IonIconName = ComponentProps<typeof Ionicons>['name'];
type MatIconName = ComponentProps<typeof MaterialIcons>['name'];

export interface NavTab {
  icon: IonIconName | MatIconName | string;
  iconFamily?: 'ionicons' | 'material';
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
        const iconColor = isActive ? colors.primary : colors.secondary;
        return (
          <Pressable
            key={tab.route}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => router.push(tab.route)}
          >
            {tab.iconFamily === 'material' ? (
              <MaterialIcons name={tab.icon as any} size={22} color={iconColor} />
            ) : (
              <Ionicons name={tab.icon as any} size={22} color={iconColor} />
            )}
            <Text style={[typography.labelSm, { color: iconColor }]}>
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