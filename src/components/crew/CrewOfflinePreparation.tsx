import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../Card';
import { Button } from '../Button';
import { colors, radius, spacing, typography } from '../../design-tokens';
import { currentQueueIdentity, sameQueueIdentity } from '../../offline/upload-queue';
import {
  inspectCrewOfflinePreparationState,
  recoverAndDownloadCrewOfflineTask,
  type CrewOfflinePreparationStatus,
} from '../../api/crewOfflinePreparation';

type UiStatus = CrewOfflinePreparationStatus | 'LOADING' | 'ERROR';

function offlinePreparationError(error: unknown): { status: 'ERROR' | 'NEEDS_CONFIRMATION' | 'PARTIAL'; message: string } {
  const err = error as { message?: string; code?: string; response?: { status?: number; data?: { code?: string } } } | undefined;
  const msg = err?.message ?? '';
  const status = err?.response?.status;
  const apiCode = err?.response?.data?.code ?? '';

  if (
    msg === 'offline_session_recovery_required' ||
    msg === 'offline_registration_reconciliation_required' ||
    msg === 'offline_snapshot_reconciliation_required' ||
    msg === 'offline_uncertain_command_requires_reconciliation' ||
    msg === 'offline_existing_intent_reconciliation_required' ||
    msg === 'offline_device_revocation_requires_online_check'
  ) {
    return {
      status: 'NEEDS_CONFIRMATION',
      message: 'Cần kiểm tra lại dữ liệu đã lưu trên máy trước khi tiếp tục.',
    };
  }
  if (status === 401 || msg === 'offline_session_changed' || msg === 'crew_session_invalid') {
    return { status: 'ERROR', message: 'Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi thử lại.' };
  }
  if (status === 403 || apiCode === 'access_forbidden' || msg === 'offline_assignment_required') {
    return { status: 'ERROR', message: 'Bạn chưa được phân công nhiệm vụ này.' };
  }
  if (status === 404 || apiCode === 'not_found') {
    return { status: 'ERROR', message: 'Không tìm thấy dữ liệu nhiệm vụ trên máy chủ.' };
  }
  if (msg === 'offline_location_source_unavailable' || apiCode === 'offline_location_source_unavailable') {
    return { status: 'ERROR', message: 'Nhiệm vụ chưa có dữ liệu tuyến đường để tải offline.' };
  }
  if (msg === 'repair_snapshot_source_unavailable' || apiCode === 'repair_snapshot_source_unavailable' || apiCode === 'repair_adapter_not_ready') {
    return { status: 'ERROR', message: 'Dữ liệu sửa chữa trên máy chủ chưa sẵn sàng.' };
  }
  if (status === 409 || status === 412 || apiCode === 'source_not_ready' || apiCode === 'concurrency_conflict' || apiCode === 'precondition_required') {
    return { status: 'ERROR', message: 'Dữ liệu nhiệm vụ đã thay đổi. Hãy tải lại rồi thử lại.' };
  }
  if (msg === 'offline_assignment_not_active') {
    return { status: 'ERROR', message: 'Trạng thái nhiệm vụ hiện tại không cho phép tải offline.' };
  }
  if (msg === 'BLOCKED_NATIVE' || msg === 'offline_device_key_mismatch') {
    return { status: 'ERROR', message: 'Thiết bị chưa đáp ứng khóa bảo mật offline.' };
  }
  if (!err?.response && (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED' || /network|timeout/i.test(msg))) {
    return { status: 'ERROR', message: 'Không có kết nối mạng. Kiểm tra mạng rồi thử lại.' };
  }
  return { status: 'ERROR', message: 'Chưa thể tải dữ liệu nhiệm vụ. Dữ liệu đã lưu vẫn được giữ.' };
}

function statusMeta(uiStatus: UiStatus): { label: string; cta: string; icon: keyof typeof MaterialIcons.glyphMap; tone: 'ready' | 'warn' | 'neutral' } {
  switch (uiStatus) {
    case 'READY':
      return { label: 'Sẵn sàng offline', cta: 'Mở nhiệm vụ offline', icon: 'check-circle', tone: 'ready' };
    case 'LOADING':
      return { label: 'Đang chuẩn bị', cta: 'Đang chuẩn bị…', icon: 'sync', tone: 'warn' };
    case 'PARTIAL':
      return { label: 'Đã lưu nhưng chưa đủ dữ liệu', cta: 'Cập nhật dữ liệu', icon: 'info', tone: 'warn' };
    case 'NEEDS_UPDATE':
      return { label: 'Cần cập nhật', cta: 'Cập nhật dữ liệu', icon: 'update', tone: 'warn' };
    case 'NEEDS_CONFIRMATION':
      return { label: 'Cần xác nhận', cta: 'Kiểm tra và tiếp tục', icon: 'verified-user', tone: 'warn' };
    case 'UNAVAILABLE':
      return { label: 'Không thể tải', cta: 'Tải dữ liệu', icon: 'block', tone: 'neutral' };
    case 'ERROR':
      return { label: 'Không thể tải', cta: 'Thử lại', icon: 'error-outline', tone: 'warn' };
    case 'NOT_DOWNLOADED':
    default:
      return { label: 'Chưa tải', cta: 'Tải dữ liệu', icon: 'cloud-download', tone: 'neutral' };
  }
}

/** User initiated, scoped to the assigned task. Reads persisted state on mount without mutation. */
export function CrewOfflinePreparation({ projectId, taskId, serverVersion }: { projectId: string; taskId: string; serverVersion?: string }) {
  const router = useRouter();
  const [identity] = useState(currentQueueIdentity);
  const [persistedStatus, setPersistedStatus] = useState<CrewOfflinePreparationStatus>('NOT_DOWNLOADED');
  const [busy, setBusy] = useState(false);
  const [errorState, setErrorState] = useState<{ status: 'ERROR' | 'NEEDS_CONFIRMATION' | 'PARTIAL'; message: string } | null>(null);
  const running = useRef(false);
  const mounted = useRef(true);
  const sequence = useRef(0);

  const readPersistedState = useCallback(async () => {
    if (!identity || !sameQueueIdentity(identity)) return;
    const seq = ++sequence.current;
    try {
      const next = await inspectCrewOfflinePreparationState(identity, projectId, taskId, serverVersion);
      if (mounted.current && seq === sequence.current && sameQueueIdentity(identity)) {
        setPersistedStatus(next.status);
      }
    } catch {
      if (mounted.current && seq === sequence.current && sameQueueIdentity(identity)) {
        setPersistedStatus('UNAVAILABLE');
      }
    }
  }, [identity, projectId, taskId, serverVersion]);

  useEffect(() => {
    mounted.current = true;
    void readPersistedState();
    return () => { mounted.current = false; };
  }, [readPersistedState]);

  useFocusEffect(useCallback(() => {
    void readPersistedState();
  }, [readPersistedState]));

  if (!identity || !sameQueueIdentity(identity)) return null;

  const uiStatus: UiStatus = busy ? 'LOADING' : errorState ? errorState.status : persistedStatus;
  const meta = statusMeta(uiStatus);
  const disabled = busy || persistedStatus === 'UNAVAILABLE';

  const onPressCta = async () => {
    if (disabled || running.current || !sameQueueIdentity(identity)) return;
    if (uiStatus === 'READY') {
      router.push({ pathname: '/(crew)/wo-detail', params: { id: taskId, projectId, offline: '1' } });
      return;
    }
    running.current = true;
    setBusy(true);
    setErrorState(null);
    const seq = ++sequence.current;
    try {
      const result = await recoverAndDownloadCrewOfflineTask(identity, projectId, taskId, serverVersion);
      const refreshed = await inspectCrewOfflinePreparationState(identity, projectId, taskId, serverVersion);
      if (mounted.current && seq === sequence.current && sameQueueIdentity(identity)) {
        setPersistedStatus(refreshed.status);
        if (!result.editorReady || refreshed.status === 'PARTIAL') {
          setErrorState({ status: 'PARTIAL', message: 'Đã lưu dữ liệu ký nhưng chưa đủ biểu mẫu. Hãy cập nhật lại.' });
        }
      }
    } catch (error) {
      await readPersistedState();
      if (mounted.current && sameQueueIdentity(identity)) {
        setErrorState(offlinePreparationError(error));
      }
    } finally {
      running.current = false;
      if (mounted.current && sameQueueIdentity(identity)) {
        setBusy(false);
      }
    }
  };

  const badgeStyle = meta.tone === 'ready' ? styles.badgeReady : meta.tone === 'warn' ? styles.badgeWarn : styles.badgeNeutral;
  const badgeTextStyle = meta.tone === 'ready' ? styles.badgeTextReady : meta.tone === 'warn' ? styles.badgeTextWarn : styles.badgeTextNeutral;
  const iconColor = meta.tone === 'ready' ? colors.success : meta.tone === 'warn' ? '#8A6D14' : '#192D40';

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBox, meta.tone === 'warn' && styles.iconBoxWarn]}>
          <MaterialIcons name={meta.icon} size={20} color={iconColor} />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Chuẩn bị làm việc offline</Text>
          <View style={[styles.badge, badgeStyle]}>
            <Text style={[styles.badgeText, badgeTextStyle]}>{meta.label}</Text>
          </View>
        </View>
      </View>
      {errorState?.message ? <Text accessibilityLiveRegion="polite" style={styles.note}>{errorState.message}</Text> : null}
      <Button title={meta.cta} variant="secondary" disabled={disabled} loading={busy} onPress={() => void onPressCta()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#DCE2E7', borderRadius: 16, gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: '#F3F5F6', alignItems: 'center', justifyContent: 'center' },
  iconBoxWarn: { backgroundColor: '#FBF8EE', borderWidth: 1, borderColor: '#E8D9A8' },
  titleWrap: { flex: 1, gap: 4 },
  title: { ...typography.titleMd, fontSize: 16, lineHeight: 22, color: '#192D40' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeReady: { backgroundColor: '#E8F5E9' },
  badgeWarn: { backgroundColor: '#FBF8EE', borderWidth: 1, borderColor: '#E8D9A8' },
  badgeNeutral: { backgroundColor: '#F3F5F6' },
  badgeText: { ...typography.caption, fontWeight: '600' },
  badgeTextReady: { color: colors.success },
  badgeTextWarn: { color: '#8A6D14' },
  badgeTextNeutral: { color: colors.secondary },
  note: { ...typography.bodyMd, color: colors.secondary },
});
