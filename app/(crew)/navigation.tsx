import React, { useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
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

  const [sheetHeight, setSheetHeight] = useState(240);
  const sheetHeightRef = useRef(240);
  const translateY = useRef(new Animated.Value(0)).current;
  const isCollapsedRef = useRef(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getCollapsedOffset = () => Math.max(140, sheetHeightRef.current - 56);

  const collapseSheet = () => {
    isCollapsedRef.current = true;
    setIsCollapsed(true);
    Animated.spring(translateY, {
      toValue: getCollapsedOffset(),
      useNativeDriver: true,
      bounciness: 3,
      speed: 16,
    }).start();
  };

  const expandSheet = () => {
    isCollapsedRef.current = false;
    setIsCollapsed(false);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 16,
    }).start();
  };

  const toggleSheet = () => {
    if (isCollapsedRef.current) {
      expandSheet();
    } else {
      collapseSheet();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        const offset = getCollapsedOffset();
        const base = isCollapsedRef.current ? offset : 0;
        let nextVal = base + gestureState.dy;
        if (nextVal < -15) nextVal = -15;
        if (nextVal > offset + 15) nextVal = offset + 15;
        translateY.setValue(nextVal);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isCollapsedRef.current) {
          if (gestureState.dy > 30 || gestureState.vy > 0.3) {
            collapseSheet();
          } else {
            expandSheet();
          }
        } else {
          if (gestureState.dy < -30 || gestureState.vy < -0.3) {
            expandSheet();
          } else {
            collapseSheet();
          }
        }
      },
    })
  ).current;

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
              subtitle: 'Km02+150 Tuyến ĐH.05',
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

      {/* Interactive Draggable Bottom Sheet (Floating overlay over full-screen map) */}
      <Animated.View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 120 && Math.abs(h - sheetHeightRef.current) > 2) {
            sheetHeightRef.current = h;
            setSheetHeight(h);
            if (isCollapsedRef.current) {
              translateY.setValue(Math.max(140, h - 56));
            }
          }
        }}
        style={[
          styles.bottomSheet,
          { transform: [{ translateY }] },
        ]}
      >
        {/* Drag Handle & Distance Header */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isCollapsed ? 'Mở rộng chi tiết lộ trình' : 'Thu gọn chi tiết lộ trình'}
          onPress={toggleSheet}
          style={styles.dragHeader}
          {...panResponder.panHandlers}
        >
          <View style={styles.handleBar}>
            <View style={styles.handle} />
          </View>

          {isCollapsed ? (
            <View style={styles.collapsedSummaryRow}>
              <View style={styles.collapsedLeft}>
                <Ionicons name="navigate" size={16} color={colors.brandGold} />
                <Text style={[typography.labelSm, styles.collapsedTitle]}>
                  450 m &bull; Km02+150 Tuyến ĐH.05 (BTXM)
                </Text>
              </View>
              <View style={styles.collapsedRight}>
                <Text style={[typography.caption, styles.collapsedHint]}>Chạm để mở</Text>
                <Ionicons name="chevron-up" size={16} color={colors.secondary} />
              </View>
            </View>
          ) : (
            <View style={styles.distanceRow}>
              <View style={styles.distanceInfo}>
                <Text style={[typography.titleLg, styles.distanceValue]}>
                  450 m <Text style={[typography.bodyMd, styles.distanceHint]}>(khoảng 2 phút đi xe)</Text>
                </Text>
                <View style={styles.tagRow}>
                  <Chip variant="severity-high" label="Nghiêm trọng" />
                  <Text style={[typography.titleMd, styles.roadTag]}>Km02+150 Tuyến ĐH.05 (Xã Bình Chánh)</Text>
                </View>
              </View>

              <View style={styles.headerRightControls}>
                <View style={styles.navCircle}>
                  <Ionicons name="navigate" size={20} color={colors.brandGold} />
                </View>
                <View style={styles.togglePill}>
                  <Ionicons name="chevron-down" size={18} color={colors.neutral} />
                </View>
              </View>
            </View>
          )}
        </Pressable>

        {/* Collapsible Content: Address Bar & Actions */}
        <View style={styles.addressBar}>
          <View style={styles.addressLeft}>
            <Ionicons name="location" size={16} color={colors.error} />
            <Text style={[typography.bodyMd, styles.addressText]}>Xã Bình Chánh, TP. Hồ Chí Minh</Text>
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
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: 2,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 30,
  },
  dragHeader: {
    paddingBottom: 2,
  },
  handleBar: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: '#D1D5DB',
  },
  collapsedSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  collapsedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  collapsedTitle: {
    color: colors.neutral,
    fontWeight: '700',
  },
  collapsedRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  collapsedHint: {
    color: colors.secondary,
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
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  navCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePill: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
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