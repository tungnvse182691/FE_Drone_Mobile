import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../design-tokens';

// Uses the established Reporter Home branding without adding account or API actions.
export function ReporterHeader({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Image source={require('../../assets/logo_hoanghai_icon.png')} style={styles.logo}
        resizeMode="contain" accessibilityLabel="Logo Bê tông Hoàng Hải" />
      <View style={styles.textBlock}>
        <Text style={[typography.titleMd, styles.brand]}>BÊ TÔNG HOÀNG HẢI</Text>
        <Text accessibilityRole="header" style={[typography.caption, styles.title]}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: spacing.screenMargin, paddingVertical: spacing.md,
  },
  logo: { width: 40, height: 40 },
  textBlock: { flex: 1 },
  brand: { color: colors.brandGold },
  title: { color: colors.secondary },
});
