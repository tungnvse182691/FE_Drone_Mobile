import React, { useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { defectTypeLabel } from '../../src/constants/defect-types';
import { TASK_MODE_CHIP } from './tasks';
import { CrewTaskBoundary } from './tasks';
import type { CrewTask } from '../../src/api/crewApi';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { RoadGuardMapLibre } from '../../src/components/map/RoadGuardMapLibre';

export default function CrewNavigationScreen() {
  return <CrewTaskBoundary operational={false}>{task => <CrewNavigationScreenContent task={task} />}</CrewTaskBoundary>;
}
function CrewNavigationScreenContent({ task }: { task: CrewTask }) {
  const params = useLocalSearchParams<{ id?: string }>();
  const modeChip = TASK_MODE_CHIP[task.task_mode];

  const targetLng = task.coordinates?.longitude;
  const targetLat = task.coordinates?.latitude;

  const openGoogleMaps = () => {
    if (!task.coordinates) return;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}`).catch(() => {});
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
        {task.coordinates ? <RoadGuardMapLibre
          style={StyleSheet.absoluteFill}
          center={[task.coordinates.longitude, task.coordinates.latitude]}
          zoom={16}
          controlsTopOffset={56}
          markers={[
            {
              id: `defect-${task.id}`,
              title: defectTypeLabel(task.defect_type_code),
              label: defectTypeLabel(task.defect_type_code),
              subtitle: `${task.chainage} • Tuyến ${task.route_code} • ${task.section_name}`,
              coordinate: [task.coordinates.longitude, task.coordinates.latitude],
              type: 'defect',
            },
          ]}

        /> : <View style={styles.missingMap}>
          <MaterialIcons name="location-off" size={48} color={colors.secondary} />
          <Text style={typography.titleLg}>Chưa có vị trí dẫn đường</Text>
          <Text style={[typography.bodyMd, { textAlign: 'center', color: colors.secondary }]}>Nhiệm vụ chưa có tọa độ hợp lệ. Bạn vẫn có thể xem thông tin và các thao tác được hỗ trợ.</Text>
        </View>}

        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" style={({ pressed }) => [styles.floatingBack, pressed && styles.pressed]}>
            <MaterialIcons name="arrow-back" size={20} color={colors.neutral} />
          </Pressable>

          <View style={styles.gpsBadge}>
            <MaterialIcons name="place" size={14} color={colors.secondary} />
            <Text style={[typography.caption, styles.gpsText]}>{task.coordinates ? 'Tọa độ nhiệm vụ từ máy chủ' : 'Chưa có tọa độ'}</Text>
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
                <MaterialIcons name="navigation" size={16} color={colors.brandGold} />
                <Text style={[typography.labelSm, styles.collapsedTitle]}>
                  {[task.route_code, task.chainage].filter(Boolean).join(' • ') || 'Thông tin nhiệm vụ'}
                </Text>
              </View>
              <View style={styles.collapsedRight}>
                <Text style={[typography.caption, styles.collapsedHint]}>Chạm để mở</Text>
                <MaterialIcons name="keyboard-arrow-up" size={16} color={colors.secondary} />
              </View>
            </View>
          ) : (
            <View style={styles.distanceRow}>
              <View style={styles.distanceInfo}>
                <Text style={[typography.titleLg, styles.distanceValue]}>
                  Vị trí hiện trường
                </Text>
                <Text style={[typography.titleMd, styles.roadTag]} numberOfLines={1}>
                  {[task.chainage, task.route_code, task.locality].filter(Boolean).join(' • ') || 'Chưa có thông tin tuyến đường'}
                </Text>
                <View style={styles.tagRow}>
                  <Chip variant={modeChip.variant} label={modeChip.label} uppercase={false} />

                </View>
              </View>

              <View style={styles.headerRightControls}>
                <View style={styles.togglePill}>
                  <MaterialIcons name="keyboard-arrow-down" size={18} color={colors.neutral} />
                </View>
              </View>
            </View>
          )}
        </Pressable>

        {/* Collapsible Content: Address Bar & Actions */}
        <View style={styles.addressBar}>
          <View style={styles.addressLeft}>
            <MaterialIcons name="place" size={16} color={colors.error} />
            <Text style={[typography.bodyMd, styles.addressText]}>
              {[task.locality, task.defect_location].filter(Boolean).join(' • ') || 'Chưa có địa chỉ hiện trường'}
            </Text>
          </View>
          <Text style={[typography.labelSm, styles.coordText]}>
            {task.coordinates ? `${task.coordinates.latitude.toFixed(4)}, ${task.coordinates.longitude.toFixed(4)}` : 'Chưa có GPS'}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.actionItem}>
            <Button
              variant="secondary"
              title="Mở Google Maps"
              disabled={!task.coordinates}
              icon={<MaterialIcons name="directions" size={18} color={colors.neutral} />}
              onPress={openGoogleMaps}
            />
          </View>
          <View style={styles.actionItem}>
            <Button
              variant="primary"
              title="Xem nhiệm vụ"
              onPress={() => router.push({ pathname: '/(crew)/wo-detail', params: { id: task.id, projectId: task.projectId } })}
            />
          </View>
        </View>
        <Text style={[typography.caption, styles.arrivalHint]}>
          Đây là vị trí nhiệm vụ từ máy chủ, không phải GPS quan sát của thiết bị. Mở nhiệm vụ để xem thao tác được phép.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  missingMap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, paddingBottom: 280, gap: spacing.md },
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
  roadTag: {
    color: colors.neutral,
    marginTop: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
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
  arrivalHint: {
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
});