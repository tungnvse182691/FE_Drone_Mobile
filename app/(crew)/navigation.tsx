import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { RoadGuardMapLibre } from '../../src/components/map/RoadGuardMapLibre';

export default function CrewNavigationScreen() {
  const openGoogleMaps = () => {
    Linking.openURL('https://www.google.com/maps/dir/?api=1&destination=10.9634,107.0125').catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.map}>
        <RoadGuardMapLibre
          style={StyleSheet.absoluteFill}
          center={[107.0110, 10.9628]}
          zoom={16}
          controlsTopOffset={56}
          markers={[
            {
              id: 'vehicle',
              title: 'Xe sửa chữa (Bạn)',
              subtitle: 'Cách vị trí lỗi 450 m',
              coordinate: [107.0090, 10.9620],
              type: 'vehicle',
            },
            {
              id: 'defect-wo118',
              title: 'Ổ gà sâu 7cm (#WO-118)',
              subtitle: 'Km1842+150 QL1A',
              coordinate: [107.0125, 10.9634],
              type: 'defect',
              severity: 'high',
            },
          ]}
          routeCoordinates={[
            [107.0090, 10.9620],
            [107.0105, 10.9626],
            [107.0125, 10.9634],
          ]}
        />

        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" style={({ pressed }) => [styles.floatingBack, pressed && styles.pressed]}>
            <Ionicons name="arrow-back" size={20} color={colors.neutral} />
          </Pressable>

          <View style={styles.gpsBadge}>
            <View style={styles.gpsDot} />
            <Text style={[typography.caption, styles.gpsText]}>GPS Đang hoạt động</Text>
          </View>
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
  topHeader: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 20,
  },
  floatingBack: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
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