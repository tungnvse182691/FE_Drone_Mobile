import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../design-tokens';

// Screen-owned actions are optional; the header does not dispatch API calls.
export function ReporterHeader({ title, onBack, rightAction }: { title: string; onBack?: () => void; rightAction?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      {onBack ? <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" testID="reporter-header-back" onPress={onBack} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={24} color={colors.neutral} />
      </Pressable> : null}
      <Image source={require('../../assets/logo_hoanghai_icon.png')} style={styles.logo}
        resizeMode="contain" accessibilityLabel="Logo Bê tông Hoàng Hải" />
      <View style={styles.textBlock}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[typography.titleMd, styles.brand]}>BÊ TÔNG HOÀNG HẢI</Text>
        <Text accessibilityRole="header" style={[typography.caption, styles.title]}>{title}</Text>
      </View>
      {rightAction}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xs,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: spacing.screenMargin, paddingVertical: spacing.sm + spacing.xs,
  },
  backButton: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 40, height: 40 },
  textBlock: { flex: 1, minWidth: 0, gap: spacing.xs },
  brand: { fontFamily: 'Sansation', color: colors.brandGold, letterSpacing: 0.6 },
  title: { color: colors.secondary },
});
