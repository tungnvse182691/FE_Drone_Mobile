import { useOperatorReadScope } from '../../src/hooks/useOperatorReadScope';
import { readOperatorSnapshot, operatorCachedNotice } from '../../src/api/operatorOfflineCache';
import { useAuthStore } from '../../src/store/auth';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { DRONE_REQUEST_DECLINE, DRONE_WORK_PACKAGE, DRONE_UPLOAD, DRONE_REQUESTS } from '../../src/constants/routes';
import { operatorAppearance } from '../../src/components/drone/appearance';
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
  operatorTaskCanRespond,
} from '../../src/api/operator-task-view';
import { messageFor } from '../../src/api/errorCatalog';
import { parseProblemDetails } from '../../src/api/problemDetails';
import { DroneTaskCommandPanel } from '../../src/components/drone/DroneTaskCommandPanel';
import { OperatorSubmittedVideos } from '../../src/components/drone/OperatorSubmittedVideos';

const ACCESS_POINT_SOURCE_LABEL: Record<string, string> = {
  PLANNED_RENDEZVOUS: 'Theo kế hoạch',
  MANUAL: 'Điểm tiếp cận do quản lý cung cấp',
  SURVEY: 'Theo khảo sát',
  EXIF: 'Theo thông tin ảnh',
  DERIVED: 'Theo dữ liệu tính toán',
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
  return `${Math.abs(latitude).toFixed(6)}°${latitude < 0 ? 'N' : 'B'}, ${Math.abs(longitude).toFixed(6)}°${longitude < 0 ? 'T' : 'Đ'}`;
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
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [workCachedAt, setWorkCachedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [workError, setWorkError] = useState<string | null>(null);
  const [workLoading, setWorkLoading] = useState(false);
  const loadSerial = useRef(0);
  const workSerial = useRef(0);
  const loadWorkPackage = useCallback(async () => {
    const isCurrent = scope.capture(), request = ++workSerial.current;
    if (!isCurrent()) return;
    setWorkLoading(true); setWorkError(null); setWorkPackage(null); setWorkCachedAt(null);
    try {
      const work = await readOperatorSnapshot(`work:${target}`, () => getOperatorWorkPackageReal(target));
      if (isCurrent() && request === workSerial.current) { setWorkPackage(work.data); setWorkCachedAt(work.cachedAt); }
    } catch (error) {
      if (!isCurrent() || request !== workSerial.current) return;
      const status = (error as {response?: {status?: number}}).response?.status;
      setWorkError(status === 401 ? 'Phiên hết hạn. Vui lòng đăng nhập lại.' :
        status === 403 ? 'Bạn không có quyền đọc gói công việc này.' :
        status === 404 ? 'Không tìm thấy gói công việc.' : 'Chưa đọc được gói công việc. Kiểm tra kết nối và thử lại.');
    } finally { if (isCurrent() && request === workSerial.current) setWorkLoading(false); }
  }, [target, scope.key, scope.capture]);

  const loadTask = useCallback(async () => {
    const currentScope = scope.capture(), request = ++loadSerial.current;
    const isCurrent = () => currentScope() && request === loadSerial.current;
    if (!isCurrent()) return;
    setDataScope(scope.key);
    setWorkPackage(null);
    setTask(null);
    setEtag(null); setCachedAt(null);
    setLoading(true);
    setLoadError(null);
    try {
      const detail = await readOperatorSnapshot(`task:${target}`, () => getOperatorSurveyTaskDetailReal(target));
      if (!isCurrent()) return;
      setTask(detail.data);
      setEtag(detail.etag);
      setCachedAt(detail.cachedAt);
      await loadWorkPackage();
    } catch (error) {
      if (!isCurrent()) return;
      setLoadError(operatorErrorMessage(error));
      setTask(null);
      setEtag(null);
      setWorkPackage(null);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [target, scope.key, scope.capture, loadWorkPackage]);

  useFocusEffect(useCallback(() => {
    void loadTask();
    return () => { loadSerial.current++; workSerial.current++; };
  }, [loadTask]));

  const displayCode = dataScope === scope.key && scope.key && task ? operatorTaskDisplayCode(task.id, params.code) : 'Nhiệm vụ';
  const canOpenDecline = !!scope.key && dataScope === scope.key && !loading && !!task &&
    task.id === target && task.operatorId === useAuthStore.getState().user?.id &&
    !!task.version && etag === `"${task.version}"` && operatorTaskCanRespond(task.status);
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
    if (!scope.capture()() || !canOpenDecline || !task) {
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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(drone)/home');
    }
  };

  const [technical, setTechnical] = useState(false);
  const [commandsExpanded, setCommandsExpanded] = useState(false);

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

    const status = task.status?.replace(/_/g, '').toUpperCase();
    const attention = ['NEWASSIGNED', 'REASSIGNED', 'SUPPLEMENTREQUIRED'].includes(status);
    const warning = attention || status === 'POSTPONED';
    const active = ['ACCEPTED', 'INPROGRESS'].includes(status);
    const failure = ['REJECTED', 'CANCELLED'].includes(status);
    const semantic = warning ? colors.warning : status === 'COMPLETED' ? colors.success : failure ? colors.error : active ? colors.brandGold : colors.secondary;
    const pastel = warning || active ? '#FEF3E2' : status === 'COMPLETED' ? '#E9F7EC' : failure ? '#FDECEC' : colors.surfaceAlt;
    return (
      <>
        {cachedAt || workCachedAt ? <Card style={styles.scopeCard}><Text style={typography.bodyMd}>{operatorCachedNotice(cachedAt ?? workCachedAt)}</Text></Card> : null}
        <Card style={styles.heroCard}>
          <View style={styles.headerTitleRow}>
            <Text style={[typography.caption, styles.codeLabel]}>Mã {displayCode}</Text>
          <View style={[styles.statusChip, { backgroundColor: pastel }]}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: semantic }} />
            <MaterialIcons name={failure || warning ? 'error-outline' : status === 'COMPLETED' ? 'check-circle-outline' : 'schedule'} size={16} color={warning || active ? colors.primaryDark : colors.secondary} />
            <Text style={[typography.caption, { color: warning || active ? colors.primaryDark : colors.secondary }]}>{operatorTaskStatusLabel(task.status)}</Text>
          </View>
          </View>
          <Text style={[typography.titleLg, styles.heroTitle]}>Khảo sát {operatorTaskTargetBand(task)}</Text>
          <View style={styles.overviewScope}>
            <Text style={styles.groupLabel}>Phạm vi khảo sát</Text>
            <View style={styles.scopeGrid}>
              <View style={styles.scopeCell}>
                <Text style={styles.metricLabel}>Dải mục tiêu</Text>
                <Text style={styles.metricValue}>{operatorTaskTargetBand(task)}</Text>
              </View>
              <View style={styles.scopeCell}>
                <Text style={styles.metricLabel}>Số phân đoạn</Text>
                <Text style={styles.metricValue}>{operatorTaskSegmentCount(task)}</Text>
              </View>
            </View>
            <View style={styles.deadlineRow}>
              <Text style={styles.infoText}>Hạn bay: <Text style={styles.medium}>{formatDateTime(workPackage?.dueAt ?? null)}</Text></Text>
            </View>
          </View>
        </Card>

        {canOpenDecline && scope.key && target ? <>
            <DroneTaskCommandPanel key={scope.key} taskId={target} presentation="premium" operation="accept"
              onResolved={() => void loadTask()}
              collapsed={!canOpenDecline && !commandsExpanded} onExpand={() => setCommandsExpanded(true)} >
              {canOpenDecline ? <Pressable style={styles.rejectButton} onPress={handleOpenDecline} accessibilityRole="button" accessibilityLabel="Từ chối nhiệm vụ">
                <MaterialIcons name="cancel" size={18} color={colors.secondary} />
                <Text style={[typography.labelLg, styles.rejectButtonText]}>Từ chối nhiệm vụ</Text>
              </Pressable> : null}
            </DroneTaskCommandPanel>
        </> : null}

        {status === 'SUPPLEMENTREQUIRED' ? <Card style={styles.scopeCard}>
          <Text style={typography.titleMd}>Khảo sát bổ sung</Text>
          <Text style={[typography.bodyMd, styles.supplementText]}>{task.supplementTaskId ? 'Quản lý yêu cầu khảo sát bổ sung. Mở nhiệm vụ được liên kết để xem phân công hiện tại.' : 'Quản lý yêu cầu khảo sát bổ sung. Kiểm tra danh sách nhiệm vụ được giao để xem các lượt anh có quyền truy cập.'}</Text>
          {task.supplementTaskId ? <Button variant="secondary" title="Mở nhiệm vụ bổ sung"
            onPress={() => {
              if (!scope.capture()()) return;
              if (task.supplementTaskId) router.push({ pathname: '/(drone)/request-detail', params: { taskId: task.supplementTaskId } });
            }} /> : null}
        </Card> : null}

        <Card style={styles.accessPointCard}>
          <View style={styles.accessPointHeader}>
            <View style={styles.accessPointHeaderLeft}>
              <Text style={[typography.titleMd, styles.accessPointHeaderTitle]}>
                Điểm tiếp cận
              </Text>
            </View>
          </View>

          {workLoading ? <Text>Đang đọc gói công việc…</Text> : workError ? <View>
            <Text accessibilityRole="alert">{workError}</Text>
            <Button title="Thử lại gói công việc" variant="secondary" onPress={() => void loadWorkPackage()} />
          </View> : accessPoint ? (
            <>
              <View style={styles.accessPointBody}>
                <View style={styles.accessPointDetailRow}>
                  <Text style={[typography.caption, styles.accessPointCoord]}>
                    Tọa độ WGS84:{' '}
                    <Text style={styles.boldCoord}>
                      {formatCoordinates(accessPoint.point.longitude, accessPoint.point.latitude)}
                    </Text>
                  </Text>
                </View>
                <View style={styles.accessPointDetailRow}>
                  <Text style={[typography.caption, styles.accessPointDesc]}>
                    {ACCESS_POINT_SOURCE_LABEL[accessPoint.source] ?? 'Theo dữ liệu máy chủ'}
                  </Text>
                </View>
              </View>

              <AnimatedPressable
                android_ripple={{ color: operatorAppearance.pressed }}
                style={styles.navMapButton}
                onPress={handleOpenGoogleMaps}
                accessibilityRole="button"
              >
                <MaterialIcons name="near-me" size={18} color="#526170" />
                <Text style={[typography.labelLg, styles.navMapButtonText]}>
                  Dẫn đường bằng Google Maps
                </Text>
              </AnimatedPressable>
            </>
          ) : (
            <View style={styles.accessPointBody}>
              <Text style={[typography.caption, styles.accessPointDesc]}>
                {workPackage?.accessPoint ? 'Tọa độ điểm tiếp cận không hợp lệ. Không thể mở dẫn đường; vui lòng liên hệ PM.' : 'Máy chủ chưa cung cấp điểm tiếp cận cho nhiệm vụ này.'}
              </Text>
            </View>
          )}
        </Card>

        <View style={styles.actionContainer}>
          {active ? <Button variant="primary" title="Gửi dữ liệu khảo sát" onPress={() => router.push({pathname:DRONE_UPLOAD,params:{taskId:task.id,projectId:task.projectId}})} /> : null}
          <Button
            variant="secondary"
            title="Bản đồ và gói công việc"
            icon={<MaterialIcons name="folder-open" size={18} color={colors.neutral} />}
            onPress={handleOpenWorkPackage}
            style={styles.workPackageButton}
          />
        </View>
        {!cachedAt ? <OperatorSubmittedVideos taskId={task.id} projectId={task.projectId} /> : null}
        <Card style={styles.technicalCard}>
          <AnimatedPressable android_ripple={{ color: operatorAppearance.pressed }} accessibilityRole="button" accessibilityLabel="Thông tin kỹ thuật" accessibilityState={{ expanded: technical }} onPress={() => setTechnical(value => !value)} style={styles.technicalToggle}>
            <MaterialIcons name="info-outline" size={18} color={colors.secondary} />
            <Text style={styles.disclosureLabel}>Thông tin kỹ thuật</Text>
            <MaterialIcons name={technical ? 'expand-less' : 'expand-more'} size={20} color={colors.secondary} />
          </AnimatedPressable>
          {technical ? <View style={styles.techDetailBox}>
            <Text selectable style={typography.caption}>Mã máy chủ: {task.id}</Text>
            <Text selectable style={typography.caption}>Phiên bản nhiệm vụ: {task.version}</Text>
            <Text selectable style={typography.caption}>Phiên bản phạm vi: {workPackage?.scopeVersion ?? 'Chưa có dữ liệu'}</Text>
            <Text style={typography.caption}>Phạm vi được ghim theo nhiệm vụ; xem các phân đoạn ở Gói công việc.</Text>
          </View> : null}
          {!canOpenDecline && scope.key && target ? <DroneTaskCommandPanel key={scope.key} taskId={target} presentation="premium" operation="accept"
            onResolved={() => void loadTask()} collapsed={!commandsExpanded} onExpand={() => setCommandsExpanded(true)} /> : null}
            {!canOpenDecline ? <AnimatedPressable android_ripple={{ color: operatorAppearance.pressed }} accessibilityRole="button" accessibilityLabel="Lệnh và đối soát" accessibilityState={{ expanded: commandsExpanded }} onPress={() => setCommandsExpanded(value => !value)} style={styles.technicalToggle}>
              <MaterialIcons name="history" size={20} color={colors.secondary} />
              <Text style={styles.disclosureLabel}>Lệnh và đối soát trên thiết bị</Text>
              <MaterialIcons name={commandsExpanded ? 'expand-less' : 'expand-more'} size={20} color={colors.secondary} />
            </AnimatedPressable> : null}
        </Card>
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
            <Text style={[typography.titleMd, styles.topBarTitle]}>Chi tiết nhiệm vụ</Text>
          </View>

          <Pressable style={styles.circleIconButton} accessibilityRole="button" accessibilityLabel="Làm mới chi tiết nhiệm vụ"
            disabled={loading} accessibilityState={{ busy: loading, disabled: loading }} onPress={() => void loadTask()}>
            {loading ? <ActivityIndicator size="small" color={colors.brandGold} /> : <MaterialIcons name="refresh" size={22} color={colors.secondary} />}
          </Pressable>
        </View>
      }
    >
      {renderBody()}
      {scope.key && target && (!task || loadError) ? <>
        <DroneTaskCommandPanel key={scope.key} taskId={target} presentation="premium" operation="accept"
          onResolved={() => void loadTask()}
          collapsed={!canOpenDecline && !commandsExpanded} onExpand={() => setCommandsExpanded(true)} >
          {canOpenDecline ? <Pressable style={styles.rejectButton} onPress={handleOpenDecline} accessibilityRole="button" accessibilityLabel="Từ chối nhiệm vụ">
            <MaterialIcons name="cancel" size={18} color={colors.secondary} />
            <Text style={[typography.labelLg, styles.rejectButtonText]}>Từ chối nhiệm vụ</Text>
          </Pressable> : null}
        </DroneTaskCommandPanel>
        {!canOpenDecline ? <Pressable accessibilityRole="button" accessibilityLabel="Lệnh và đối soát" accessibilityState={{ expanded: commandsExpanded }} onPress={() => setCommandsExpanded(value => !value)} style={styles.technicalToggle}>
          <MaterialIcons name="history" size={20} color={colors.secondary} />
          <Text style={styles.disclosureLabel}>Lệnh và đối soát trên thiết bị</Text>
          <MaterialIcons name={commandsExpanded ? 'expand-less' : 'expand-more'} size={20} color={colors.secondary} />
        </Pressable> : null}
      </> : null}
      {acceptError ? <Text accessibilityRole="alert">{acceptError}</Text> : null}
    </SafeAreaScreen>
  );
}


const styles = StyleSheet.create({
  overviewScope: { borderTopWidth: 1, borderTopColor: '#DCE2E7', paddingTop: 12 },
  scopeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  scopeCell: { flexGrow: 1, flexBasis: 120, minWidth: 0, gap: 4 },
  metricLabel: { ...typography.caption, color: '#526170', lineHeight: 18 },
  metricValue: { ...typography.bodyMd, fontFamily: 'Roboto-Medium', color: '#192D40', lineHeight: 22, fontVariant: ['tabular-nums'] },
  deadlineRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#DCE2E7' },
  disclosureLabel: { ...typography.bodyMd, color: '#526170', flex: 1, lineHeight: 21 },
  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  loadingText: { color: colors.secondary },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.screenMargin, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  circleIconButton: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  topBarCenter: { flex: 1, minWidth: 0, alignItems: 'center' },
  topBarTitle: { color: colors.neutral },
  heroCard: { ...operatorAppearance.card, borderRadius: 16, borderColor: '#DCE2E7', marginBottom: 12, padding: 16 },
  headerTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  overline: { ...typography.labelSm, color: colors.brandGold, flex: 1, lineHeight: 18 },
  statusChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6 },
  groupLabel: { ...typography.bodyMd, fontFamily: 'Roboto-Medium', color: '#192D40', lineHeight: 21, marginBottom: 12 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { ...typography.bodyMd, color: colors.secondary, flex: 1 },
  medium: { fontFamily: 'Roboto-Medium', color: colors.neutral },
  divider: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 },
  heroTitle: { ...typography.titleMd, fontSize: 18, lineHeight: 26, color: '#192D40', marginTop: 12, marginBottom: 16 },
  codeLabel: { color: '#192D40', fontFamily: 'Roboto-Medium', fontVariant: ['tabular-nums'], backgroundColor: '#F3F5F6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, overflow: 'hidden', lineHeight: 18 },
  sectionTitle: { color: colors.neutral, marginBottom: spacing.sm },
  supplementText: { color: colors.secondary, marginVertical: spacing.sm },
  scopeCard: { ...operatorAppearance.card, borderRadius: 16, borderColor: '#DCE2E7', marginBottom: 12 },
  accessPointCard: { ...operatorAppearance.card, borderRadius: 16, borderColor: '#DCE2E7', marginBottom: 12, padding: 16 },
  accessPointHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  accessPointHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  accessPointHeaderTitle: { flex: 1, color: '#192D40', lineHeight: 24 },
  accessPointBody: { gap: 8, marginVertical: 8 },
  accessPointDetailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  accessPointDesc: { ...typography.bodyMd, color: '#526170', flex: 1, lineHeight: 21 },
  accessPointCoord: { ...typography.bodyMd, color: '#526170', flex: 1, lineHeight: 21 },
  boldCoord: { color: '#192D40', fontFamily: 'Roboto-Medium', fontVariant: ['tabular-nums'] },
  navMapButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#DCE2E7', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F3F5F6', marginTop: 4, overflow: 'hidden' },
  navMapButtonText: { ...typography.bodyMd, color: '#192D40', flexShrink: 1, lineHeight: 21, textAlign: 'center' },
  technicalCard: { ...operatorAppearance.card, borderRadius: 16, borderColor: '#DCE2E7', marginBottom: 12, paddingVertical: 4 },
  techDetailBox: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs, gap: spacing.sm },
  technicalToggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionContainer: { gap: spacing.sm, marginBottom: spacing.md },
  workPackageButton: { width: '100%', minHeight: 48, backgroundColor: colors.surface, borderColor: '#DCE2E7', borderRadius: 12 },
  rejectButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#DCE2E7', borderRadius: 12, padding: 8, backgroundColor: colors.surface },
  rejectButtonText: { color: colors.neutral, textAlign: 'center', lineHeight: 21, flexShrink: 1 },
  syncFootnote: { textAlign: 'center', color: colors.secondary, marginTop: spacing.xs },
});
