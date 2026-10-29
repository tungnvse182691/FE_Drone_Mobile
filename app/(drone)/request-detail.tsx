import { useOperatorReadScope } from '../../src/hooks/useOperatorReadScope';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { DRONE_REQUEST_DECLINE, DRONE_WORK_PACKAGE } from '../../src/constants/routes';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import {
  getOperatorSurveyTaskDetailReal,
  getOperatorWorkPackageReal,
  type SurveyTaskV2ResponseDto,
  type SurveyTaskWorkPackageDto,
} from '../../src/api/droneApi';
import {
  operatorTaskDisplayCode,
  operatorTaskSegmentCount,
  operatorTaskStatusLabel,
  operatorTaskTargetBand,
} from '../../src/api/operator-task-view';
import { messageFor } from '../../src/api/errorCatalog';
import { parseProblemDetails } from '../../src/api/problemDetails';
import { DroneTaskCommandPanel } from '../../src/components/drone/DroneTaskCommandPanel';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

const ACCESS_POINT_SOURCE_LABEL: Record<string, string> = {
  PLANNED_RENDEZVOUS: 'Theo kế hoạch',
};

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return 'Chưa đặt hạn';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Chưa đặt hạn';
  }
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatCoordinates(longitude: number, latitude: number): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function operatorErrorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: unknown } }).response;
  const code = parseProblemDetails(response?.data).code;
  if (code) {
    return messageFor(code);
  }
  const parsed = parseProblemDetails(response?.data);
  return 'Không đọc được nhiệm vụ. Vui lòng thử lại.';
}

export default function DroneRequestDetailScreen() {
  const params = useLocalSearchParams<{ code?: string; taskId?: string }>();
  const target = params.taskId || params.code || '';
  const scope = useOperatorReadScope(target);
  const [dataScope, setDataScope] = useState<string | null>(null);

  const [task, setTask] = useState<SurveyTaskV2ResponseDto | null>(null);
  const [workPackage, setWorkPackage] = useState<SurveyTaskWorkPackageDto | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const loadTask = useCallback(async () => {
    const isCurrent = scope.capture();
    if (!isCurrent()) return;
    setDataScope(scope.key);
    setWorkPackage(null);
    setTask(null);
    setLoading(true);
    setLoadError(null);
    try {
      const detail = await getOperatorSurveyTaskDetailReal(target);
      if (!isCurrent()) return;
      setTask(detail.data);
      setEtag(detail.etag);
      try {
        const work = await getOperatorWorkPackageReal(target);
        if (!isCurrent()) return;
        setWorkPackage(work.data);
      } catch {
        if (!isCurrent()) return;
        setWorkPackage(null);
      }
    } catch (error) {
      if (!isCurrent()) return;
      setLoadError(operatorErrorMessage(error));
      setTask(null);
      setEtag(null);
      setWorkPackage(null);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [target, scope.key, scope.capture]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

  const displayCode = dataScope === scope.key && scope.key && task ? operatorTaskDisplayCode(task.id, params.code) : 'Nhiệm vụ';
  const point = workPackage?.accessPoint?.point;
  const accessPoint = point && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180 ? workPackage!.accessPoint : null;

  const handleOpenGoogleMaps = () => {
    if (!scope.capture()() || !accessPoint) {
      return;
    }
    // US-40, BR-38: Dẫn đường WGS84 tới Điểm tiếp cận cất/hạ cánh (Access Point)
    const url = `https://www.google.com/maps/dir/?api=1&destination=${accessPoint.point.latitude},${accessPoint.point.longitude}`;
    Linking.openURL(url).catch(() => { if (scope.capture()()) setAcceptError('Không mở được ứng dụng bản đồ.'); });
  };

/**
 * Từ chối nhiệm vụ được tách sang màn O-04 (`request-decline`) để gọi đúng contract
 * lệnh từ chối (API-230) với Idempotency-Key + If-Match. Màn này chỉ còn điều hướng.
 */
  const handleOpenDecline = () => {
    if (!scope.capture()() || dataScope !== scope.key || !task) {
      return;
    }
    router.push(`${DRONE_REQUEST_DECLINE}?taskId=${encodeURIComponent(task.id)}`);
  };

  const handleOpenWorkPackage = () => {
    if (!scope.capture()() || dataScope !== scope.key || !task) {
      return;
    }
    router.push(`${DRONE_WORK_PACKAGE}?taskId=${encodeURIComponent(task.id)}`);
  };

  const handleShareTask = async () => {
    if (!scope.capture()() || dataScope !== scope.key || !task) {
      return;
    }
    const parts = [
      `Nhiệm vụ khảo sát ${displayCode}`,
      operatorTaskStatusLabel(task.status),
      `Dải mục tiêu: ${operatorTaskTargetBand(task)}`,
      `Hạn bay: ${formatDateTime(workPackage?.dueAt ?? null)}`,
    ];
    if (accessPoint) {
      parts.push(
        `Điểm tiếp cận WGS84: ${accessPoint.point.latitude.toFixed(6)}, ${accessPoint.point.longitude.toFixed(6)}`,
      );
    }
    try {
      await Share.share({ message: parts.join(' • ') });
    } catch {
      // ignore
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(drone)/home');
    }
  };

  const renderBody = () => {
    if (!scope.key || dataScope !== scope.key || loading) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[typography.caption, styles.loadingText]}>Đang đọc nhiệm vụ khảo sát…</Text>
        </View>
      );
    }

    if (loadError || !task) {
      return (
        <EmptyState
          icon="error-outline"
          title="Không đọc được nhiệm vụ"
          message={loadError ?? 'Vui lòng thử lại.'}
          actionLabel="Tải lại"
          onAction={() => void loadTask()}
        />
      );
    }

    const s = task.status?.toUpperCase();

    return (
      <>
        <Card style={styles.headerCard}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerTextGroup}>
              <Text style={[typography.caption, styles.codeLabel]}>MÃ NHIỆM VỤ: {displayCode}</Text>
              <Text style={[typography.titleLg, styles.roadTitle]}>Nhiệm vụ khảo sát</Text>
            </View>
            <Chip
              variant={task.status === 'REJECTED' ? 'rejected' : 'status-pending'}
              label={operatorTaskStatusLabel(task.status)}
              uppercase={false}
            />
          </View>

          <View style={styles.locationDivider}>
            <MaterialIcons name="map" size={18} color={colors.primary} />
            <Text style={[typography.bodyMd, styles.locationFull]}>
              Dải mục tiêu: {operatorTaskTargetBand(task)}
            </Text>
          </View>
        </Card>

        <Card style={styles.paramCard}>
          <View style={styles.paramCardHeader}>
            <MaterialIcons name="assignment" size={18} color={colors.primary} />
            <Text style={[typography.labelSm, styles.paramHeaderTitle]}>PHẠM VI ĐƯỢC GHIM</Text>
          </View>

          <View style={styles.paramGrid}>
            <View style={styles.paramItem}>
              <Text style={[typography.caption, styles.paramLabel]}>Số phân đoạn</Text>
              <Text style={[typography.bodyMd, styles.paramValue]}>
                {operatorTaskSegmentCount(task)}
              </Text>
            </View>

            <View style={styles.paramItem}>
              <Text style={[typography.caption, styles.paramLabel]}>Hạn bay</Text>
              <Text style={[typography.bodyMd, styles.paramValue]}>
                {formatDateTime(workPackage?.dueAt ?? null)}
              </Text>
            </View>

            <View style={styles.paramItem}>
              <Text style={[typography.caption, styles.paramLabel]}>Dải mục tiêu</Text>
              <Text style={[typography.bodyMd, styles.paramValue]}>
                {operatorTaskTargetBand(task)}
              </Text>
            </View>
          </View>

          {workPackage ? (
            <View style={styles.techDetailBox}>
              <View style={styles.techRow}>
                <MaterialIcons name="lock-outline" size={16} color={colors.primary} />
                <Text style={[typography.caption, styles.techText]}>
                  Phạm vi chỉ đọc, ghim theo nhiệm vụ; xem chi tiết ở Gói công việc.
                </Text>
              </View>
            </View>
          ) : null}
        </Card>

        <Card style={styles.accessPointCard}>
          <View style={styles.accessPointHeader}>
            <View style={styles.accessPointHeaderLeft}>
              <MaterialIcons name="flight-takeoff" size={18} color={colors.primary} />
              <Text style={[typography.labelSm, styles.accessPointHeaderTitle]}>
                ĐIỂM TIẾP CẬN CẤT-HẠ CÁNH
              </Text>
            </View>
          </View>

          {accessPoint ? (
            <>
              <View style={styles.accessPointBody}>
                <View style={styles.accessPointDetailRow}>
                  <MaterialIcons name="my-location" size={16} color={colors.primary} />
                  <Text style={[typography.caption, styles.accessPointCoord]}>
                    Tọa độ WGS84:{' '}
                    <Text style={styles.boldCoord}>
                      {formatCoordinates(accessPoint.point.longitude, accessPoint.point.latitude)}
                    </Text>
                  </Text>
                </View>
                <View style={styles.accessPointDetailRow}>
                  <MaterialIcons name="landscape" size={16} color={colors.secondary} />
                  <Text style={[typography.caption, styles.accessPointDesc]}>
                    {ACCESS_POINT_SOURCE_LABEL[accessPoint.source] ?? 'Theo dữ liệu máy chủ'}
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.navMapButton}
                onPress={handleOpenGoogleMaps}
                accessibilityRole="button"
              >
                <MaterialIcons name="near-me" size={18} color={colors.primary} />
                <Text style={[typography.labelLg, styles.navMapButtonText]}>
                  Dẫn đường đến Điểm tiếp cận (Google Maps)
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.accessPointBody}>
              <Text style={[typography.caption, styles.accessPointDesc]}>
                Máy chủ chưa công bố điểm tiếp cận cho nhiệm vụ này. Liên hệ PM nếu cần bổ sung.
              </Text>
            </View>
          )}
        </Card>

        <View style={styles.actionContainer}>
          <Button
            variant="secondary"
            title="Xem gói công việc (chỉ đọc)"
            icon={<MaterialIcons name="folder-open" size={18} color={colors.neutral} />}
            onPress={handleOpenWorkPackage}
          />

          <Pressable
            style={styles.rejectButton}
            onPress={handleOpenDecline}
            accessibilityRole="button"
            accessibilityLabel="Từ chối nhiệm vụ"
          >
            <MaterialIcons name="cancel" size={18} color={colors.error} />
            <Text style={[typography.labelLg, styles.rejectButtonText]}>
              Từ chối nhiệm vụ
            </Text>
          </Pressable>

          <Text style={[typography.caption, styles.syncFootnote]}>
            Thông tin nhiệm vụ được đọc từ máy chủ. Lệnh tiếp nhận hoặc từ chối được lưu trước khi bạn xác nhận gửi.
          </Text>
        </View>
      </>
    );
  };

  return (
    <SafeAreaScreen
      scroll
      header={
        <View style={styles.topBar}>
          <Pressable
            style={styles.circleIconButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.secondary} />
          </Pressable>

          <View style={styles.topBarCenter}>
            <Text style={[typography.titleMd, styles.topBarCode]}>{displayCode}</Text>
            <Text style={[typography.caption, styles.topBarSub]}>Chi tiết nhiệm vụ bay</Text>
          </View>

          <Pressable
            style={styles.circleIconButton}
            onPress={handleShareTask}
            accessibilityRole="button"
            accessibilityLabel="Chia sẻ nhiệm vụ bay"
          >
            <MaterialIcons name="share" size={18} color={colors.secondary} />
          </Pressable>
        </View>
      }
    >
      {renderBody()}
      {acceptError ? <Text accessibilityRole="alert">{acceptError}</Text> : null}
      {scope.key && target ? <DroneTaskCommandPanel key={scope.key} taskId={target} operation="accept" /> : null}
    </SafeAreaScreen>
  );
}


const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.secondary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenMargin,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  circleIconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarCode: {
    color: colors.brandGold,
    fontWeight: '700',
  },
  topBarSub: {
    color: colors.secondary,
  },
  selectorBar: {
    marginBottom: spacing.sm,
  },
  selectorTitle: {
    color: colors.secondary,
    marginBottom: 6,
  },
  selectorScroll: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  taskChip: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 110,
    gap: 2,
  },
  taskChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#FEF3E2',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  taskChipCode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.neutral,
  },
  taskChipCodeActive: {
    color: colors.primaryDark,
  },
  taskChipRoad: {
    fontSize: 10,
    color: colors.secondary,
  },
  taskChipRoadActive: {
    color: colors.neutral,
    fontWeight: '500',
  },
  headerCard: {
    marginBottom: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextGroup: {
    flex: 1,
    marginRight: spacing.sm,
  },
  codeLabel: {
    color: colors.secondary,
    fontWeight: '600',
  },
  roadTitle: {
    color: colors.neutral,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusPillText: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '700',
  },
  locationDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  locationFull: {
    color: colors.secondary,
    flex: 1,
  },
  paramCard: {
    marginBottom: spacing.sm,
  },
  paramCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  paramHeaderTitle: {
    color: colors.secondary,
  },
  paramGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  paramItem: {
    width: '48%',
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  paramLabel: {
    color: colors.secondary,
  },
  paramValue: {
    color: colors.neutral,
    fontWeight: '700',
    marginTop: 2,
  },
  accessPointCard: {
    marginBottom: spacing.sm,
    backgroundColor: '#FBFBFA',
    borderWidth: 1,
    borderColor: colors.border,
  },
  accessPointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  accessPointHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  accessPointHeaderTitle: {
    color: colors.secondary,
    fontWeight: '700',
  },
  accessPointBody: {
    gap: 4,
    marginVertical: spacing.xs,
  },
  accessPointName: {
    color: colors.neutral,
    fontWeight: '700',
  },
  accessPointDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accessPointDesc: {
    color: colors.secondary,
    flex: 1,
  },
  accessPointCoord: {
    color: colors.secondary,
    flex: 1,
  },
  boldCoord: {
    fontWeight: '700',
    color: colors.neutral,
    fontFamily: 'Roboto',
  },
  navMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    marginTop: spacing.xs,
  },
  navMapButtonText: {
    color: colors.neutral,
    fontWeight: '600',
    fontSize: 13,
  },
  techDetailBox: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
    gap: 6,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  techText: {
    color: colors.secondary,
    flex: 1,
  },
  techBold: {
    fontWeight: '600',
    color: colors.neutral,
  },
  mapCard: {
    marginBottom: spacing.sm,
    padding: 0,
    overflow: 'hidden',
    borderRadius: radius.xl,
    ...softShadow,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mapHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapHeaderTitle: {
    color: colors.secondary,
  },
  gpsCoord: {
    color: colors.secondary,
    fontFamily: 'Roboto',
  },
  mapVisualContainer: {
    height: 180,
    backgroundColor: '#E8ECEF',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulatedRiver: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#D2E3F0',
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },
  riverLabel: {
    fontSize: 10,
    color: '#7C9DB8',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  simulatedRoad: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: '#FCE8B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roadStripe: {
    position: 'absolute',
    height: 4,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
  },
  roadNameLabel: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.neutral,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinTarget: {
    position: 'absolute',
    top: 25,
    alignItems: 'center',
  },
  pinCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.neutral,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginBottom: 2,
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  pinText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  pinIconWrap: {
    marginTop: -4,
  },
  mapsLinkOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapsLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral,
  },
  instructionCard: {
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    ...softShadow,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  instructionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  instructionTitle: {
    color: colors.secondary,
  },
  instructionTime: {
    color: colors.secondary,
  },
  quoteBox: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginVertical: spacing.xs,
  },
  quoteText: {
    color: colors.neutral,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  boldText: {
    fontWeight: 'bold',
    color: colors.neutral,
    fontStyle: 'normal',
  },
  instructionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  senderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  senderName: {
    color: colors.secondary,
  },
  priorityPill: {
    backgroundColor: '#FDECEC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  priorityText: {
    color: colors.error,
    fontSize: 10,
    fontWeight: '700',
  },
  actionContainer: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  pendingSyncNote: {
    color: colors.secondary,
    textAlign: 'center',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  rejectButtonText: {
    color: colors.error,
    fontWeight: '700',
  },
  syncFootnote: {
    textAlign: 'center',
    color: colors.secondary,
    marginTop: 2,
  },
});
