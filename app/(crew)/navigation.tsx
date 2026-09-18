import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

export default function CrewNavigationScreen() {
  const openGoogleMaps = () => {
    Linking.openURL('https://www.google.com/maps/dir/?api=1&destination=10.9634,107.0125').catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.map}>
        <View style={styles.landBlockOne} />
        <View style={styles.landBlockTwo} />
        <View style={styles.river} />
        <View style={styles.roadVerticalOne} />
        <View style={styles.roadVerticalTwo} />
        <View style={styles.roadHorizontalOne} />
        <View style={styles.roadHorizontalTwo} />
        <View style={styles.route} />

        <View style={styles.youMarker}>
          <View style={styles.youHalo} />
          <View style={styles.youDot} />
        </View>
        <View style={styles.youLabel}>
          <Text style={[typography.caption, styles.youLabelText]}>Vị trí của bạn</Text>
        </View>

        <View style={styles.destMarker}>
          <View style={styles.destDot} />
          <View style={styles.destStem} />
        </View>
        <View style={styles.destLabel}>
          <View style={styles.destAccent} />
          <View>
            <Text style={[typography.caption, styles.destTitle]}>Ổ gà sâu 7cm</Text>
            <Text style={[typography.labelSm, styles.destSub]}>Km1842+150 QL1A</Text>
          </View>
        </View>

        <Pressable onPress={() => router.back()} accessibilityRole="button" style={({ pressed }) => [styles.floatingBack, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={20} color={colors.neutral} />
        </Pressable>

        <View style={styles.gpsBadge}>
          <View style={styles.gpsDot} />
          <Text style={[typography.caption, styles.gpsText]}>GPS Đang hoạt động</Text>
        </View>

        <View style={styles.controls}>
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}>
            <Ionicons name="compass-outline" size={20} color={colors.info} />
          </Pressable>
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}>
            <Ionicons name="layers-outline" size={20} color={colors.neutral} />
          </Pressable>
        </View>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.handle} />
        <View style={styles.distanceRow}>
          <View style={styles.distanceInfo}>
            <Text style={[typography.titleLg, styles.distanceValue]}>
              450 m <Text style={[typography.bodyMd, styles.distanceHint]}>(khoảng 2 phút đi xe)</Text>
            </Text>
            <View style={styles.tagRow}>
              <Chip variant="severity-high" label="Nghiêm trọng" />
              <Text style={[typography.titleMd, styles.roadTag]}>Km1842+150 QL1A</Text>
            </View>
          </View>
          <View style={styles.navCircle}>
            <Ionicons name="navigate" size={24} color={colors.brandGold} />
          </View>
        </View>

        <View style={styles.addressBar}>
          <View style={styles.addressLeft}>
            <Ionicons name="location" size={16} color={colors.error} />
            <Text style={[typography.bodyMd, styles.addressText]}>Xã Hố Nai 3, Trảng Bom, Đồng Nai</Text>
          </View>
          <Text style={[typography.labelSm, styles.coordText]}>10.9634, 107.0125</Text>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.actionItem}>
            <Button variant="secondary" title="Mở Google Maps" onPress={openGoogleMaps} />
          </View>
          <View style={styles.actionItem}>
            <Button variant="primary" title="✓ Đã đến nơi" onPress={() => router.push('/(crew)/progress')} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  map: {
    flex: 1,
    overflow: 'hidden',
  },
  landBlockOne: {
    position: 'absolute',
    top: 110,
    left: 20,
    width: 120,
    height: 150,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  landBlockTwo: {
    position: 'absolute',
    top: 50,
    left: 220,
    width: 150,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  river: {
    position: 'absolute',
    top: 230,
    left: -20,
    right: -20,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: 'rgba(59,130,246,0.3)',
    transform: [{ rotate: '-6deg' }],
  },
  roadVerticalOne: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 50,
    width: 4,
    backgroundColor: colors.border,
  },
  roadVerticalTwo: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 310,
    width: 4,
    backgroundColor: colors.border,
  },
  roadHorizontalOne: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 380,
    height: 4,
    backgroundColor: colors.border,
  },
  roadHorizontalTwo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 540,
    height: 4,
    backgroundColor: colors.border,
  },
  route: {
    position: 'absolute',
    top: 480,
    left: 150,
    width: 200,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    opacity: 0.85,
    transform: [{ rotate: '-38deg' }],
  },
  youMarker: {
    position: 'absolute',
    bottom: 210,
    left: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  youHalo: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: 'rgba(59,130,246,0.25)',
  },
  youDot: {
    width: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: colors.info,
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
  youLabel: {
    position: 'absolute',
    bottom: 176,
    left: 22,
    backgroundColor: colors.neutral,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  youLabelText: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  destMarker: {
    position: 'absolute',
    top: 140,
    right: 80,
    alignItems: 'center',
  },
  destDot: {
    width: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: colors.error,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  destStem: {
    width: 2,
    height: 8,
    backgroundColor: colors.error,
  },
  destLabel: {
    position: 'absolute',
    top: 160,
    right: 66,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  destAccent: {
    width: 4,
    height: 28,
    backgroundColor: colors.error,
    borderRadius: radius.sm,
  },
  destTitle: {
    color: colors.neutral,
    fontWeight: '700',
  },
  destSub: {
    color: colors.secondary,
  },
  floatingBack: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  gpsText: {
    color: colors.neutral,
  },
  controls: {
    position: 'absolute',
    top: 64,
    right: spacing.md,
    gap: spacing.sm,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: -spacing.sm,
    marginBottom: spacing.xs,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distanceInfo: {
    flex: 1,
  },
  distanceValue: {
    color: colors.neutral,
  },
  distanceHint: {
    color: colors.secondary,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  roadTag: {
    color: colors.neutral,
  },
  navCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  addressText: {
    color: colors.secondary,
    flexShrink: 1,
  },
  coordText: {
    color: colors.secondary,
    marginLeft: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  actionItem: {
    flex: 1,
  },
});