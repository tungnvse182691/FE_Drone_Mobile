import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { StatusBadge } from '../../src/components/StatusBadge';
import { EmptyState } from '../../src/components/EmptyState';
import { Toast } from '../../src/components/Toast';
import { initDatabase, openDatabase } from '../../src/offline/database';
import {
  countByState,
  decodeOutboxPayload,
  processQueue,
  recoverInFlight,
  retry as retryQueuedItem,
  type OperationReceipt,
  type OutboxItem,
} from '../../src/offline/upload-queue';
import { apiClient } from '../../src/api/client';
import { getDeviceId } from '../../src/constants/device';
import {
  SYNC_OUTCOME_TO_LOCAL_STATE,
  type SyncOperation,
  type SyncResult,
  isDispatchableSyncOperationKind,
} from '../../src/types/domain';
import { getCrewTaskById } from './tasks';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { LocalState, SyncStatus } from '../../src/types/enums';

/**
 * `kind` được phép gửi thật qua `POST /sync/batches` nằm tại
 * `src/types/domain.ts#RUNTIME_SYNC_OPERATION_KINDS`.
 *
 * Map trạng thái server trong `SyncOutcome` sang `LocalState` 09 nằm tại
 * `src/types/domain.ts#SYNC_OUTCOME_TO_LOCAL_STATE` (dùng chung với màn DRONE).
 * DUPLICATE = idempotent replay đã có bản ghi bền vững nên coi như ACK.
 */
type SyncSegment = 'pending' | 'done';

interface QueueItem {
  id?: string;
  name: string;
  meta: string;
  size: string;
  status: SyncStatus;
  progress?: number;
}

const SEGMENT_LABELS: Record<SyncSegment, string> = {
  pending: 'Đang chờ',
  done: 'Đã đồng bộ',
};

const LOCAL_STATE_TO_SYNC_STATUS: Record<string, SyncStatus> = {
  [LocalState.DRAFT]: SyncStatus.QUEUED,
  [LocalState.WAITING_DEPENDENCIES]: SyncStatus.QUEUED,
  [LocalState.READY]: SyncStatus.QUEUED,
  [LocalState.IN_FLIGHT]: SyncStatus.UPLOADING,
  [LocalState.PAUSED_RETRY]: SyncStatus.QUEUED,
  [LocalState.UNKNOWN_OUTCOME]: SyncStatus.QUEUED,
  [LocalState.AUTH_REQUIRED]: SyncStatus.QUEUED,
  [LocalState.BLOCKED_CONTRACT]: SyncStatus.INVALID,
  [LocalState.CONFLICT]: SyncStatus.INVALID,
  [LocalState.REJECTED]: SyncStatus.INVALID,
  [LocalState.ACKED]: SyncStatus.SERVER_CONFIRMED,
};

export default function CrewSyncScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const task = getCrewTaskById(params.id);
  const [segment, setSegment] = useState<SyncSegment>('pending');
  const [toast, setToast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [outboxRows, setOutboxRows] = useState<OutboxItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const database = openDatabase();
    void initDatabase(database)
      .then(() => {
        if (!cancelled) {
          setDb(database);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setToast('Không mở được cơ sở dữ liệu cục bộ để đọc hàng đợi.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!db) {
      return;
    }
    try {
      await recoverInFlight(db);
      const rows = await db.getAllAsync<OutboxItem>(
        `SELECT id, kind, payload_b64 AS data_b64, checksum_sha256, local_state AS status,
                attempt, '5' AS max_attempts, last_error, created_at, updated_at
           FROM offline_outbox ORDER BY created_at DESC`,
      );
      setOutboxRows(rows);
    } catch {
      setToast('Không đọc được hàng đợi đồng bộ cục bộ.');
    }
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const activeItemId = useMemo(() => {
    const invalid = outboxRows.find(
      (row) => LOCAL_STATE_TO_SYNC_STATUS[row.status] === SyncStatus.INVALID,
    );
    return invalid?.id ?? outboxRows[0]?.id ?? null;
  }, [outboxRows]);

  const syncNow = useCallback(async () => {
    if (!db) {
      return;
    }
    setSyncing(true);
    setToast(`Đang đồng bộ ${outboxRows.length} mục trong hàng đợi…`);
    try {
      await processQueue(db, async (item) => {
        const payload = JSON.parse(decodeOutboxPayload(item)) as Record<string, unknown>;
        // Outbox lưu kind theo tên thao tác nội bộ (`submit_inspection`, …) chưa chắc
        // là kind canonical của SyncOperation. Không ép kiểu để lách schema.
        const kind = (payload.kind as string | undefined) ?? item.kind;
        if (!isDispatchableSyncOperationKind(kind)) {
          return [
            {
              operationId: item.id,
              localState: LocalState.BLOCKED_CONTRACT,
              errorCode: 'UNMAPPED_OPERATION_KIND',
              errorMessage: `Kind "${kind}" chưa ánh xạ sang SyncOperation canonical.`,
            },
          ];
        }
        // `SyncBatch` additionalProperties=false, cần deviceId + operations (1..100).
        // `REPAIR_SUBMIT` dùng attemptId (không taskId) theo SyncAttemptSubmit.
        const operation: SyncOperation = {
          operationId: item.id,
          kind,
          expectedVersion: (payload.expectedVersion as string) ?? item.expected_version ?? '0',
          capturedAt: (payload.capturedAt as string) ?? item.created_at,
          ...(kind === 'REPAIR_SUBMIT'
            ? { attemptId: String(payload.attemptId ?? payload.attempt_id ?? item.id) }
            : { taskId: String(payload.taskId ?? payload.task_id ?? item.task_id ?? '') }),
          payload,
        } as SyncOperation;

        const response = await apiClient.post<SyncResult>(
          '/sync/batches',
          { deviceId: getDeviceId(), operations: [operation] },
          { headers: { 'X-Operation-Id': item.id, 'Idempotency-Key': item.id } },
        );

        const results = response.data?.results;
        // `results` thiếu/không phải mảng => envelope không hợp lệ, không ACK.
        if (!Array.isArray(results) || results.length === 0) {
          return undefined;
        }

        return results.map<OperationReceipt>((outcome) => ({
          operationId: outcome.operationId,
          localState: SYNC_OUTCOME_TO_LOCAL_STATE[outcome.status],
          resourceId: outcome.resourceId,
          resourceVersion: outcome.version,
          errorCode: outcome.error?.code ?? null,
          errorMessage: outcome.error?.message ?? null,
          traceId: outcome.error?.traceId ?? null,
        }));
      });
      await reload();
      const counts = await countByState(db);
      setToast(`Đồng bộ xong. Còn ${counts[LocalState.READY] ?? 0} mục chờ gửi.`);
    } catch (error) {
      await reload();
      setToast(error instanceof Error ? error.message : 'Đồng bộ thất bại, đã giữ trong hàng đợi.');
    } finally {
      setSyncing(false);
    }
  }, [db, outboxRows.length, reload]);

  const queueItems = useMemo<QueueItem[]>(() => {
    if (outboxRows.length > 0) {
      return outboxRows.map((row) => ({
        id: row.id,
        name: row.kind,
        meta: row.last_error ? `Lỗi: ${row.last_error}` : `SHA-256 ${row.checksum_sha256.slice(0, 12)}…`,
        size: `Lần thử ${row.attempt}/${row.max_attempts}`,
        status: LOCAL_STATE_TO_SYNC_STATUS[row.status] ?? SyncStatus.QUEUED,
      }));
    }
    return [];
  }, [outboxRows]);

  const visibleItems = useMemo<QueueItem[]>(() => {
    if (outboxRows.length === 0) {
      return [];
    }
    const doneStatus = SyncStatus.SERVER_CONFIRMED;
    const matches = (item: QueueItem) =>
      segment === 'done' ? item.status === doneStatus : item.status !== doneStatus;
    return queueItems.filter(matches);
  }, [queueItems, segment, outboxRows.length]);

  const counts = useMemo(() => {
    const doneCount = queueItems.filter((item) => item.status === SyncStatus.SERVER_CONFIRMED).length;
    return {
      pending: queueItems.length - doneCount,
      done: doneCount,
    } as Record<SyncSegment, number>;
  }, [queueItems]);

  

  const refresh = () => {
    void reload();
    setToast('Đã làm mới danh sách đồng bộ từ hàng đợi cục bộ.');
  };

  const retry = async () => {
    if (!db || !activeItemId) {
      setToast('Không có mục nào đang lỗi để gửi lại.');
      return;
    }
    setSyncing(true);
    try {
      await retryQueuedItem(db, activeItemId);
      await reload();
      setToast('Đã đưa mục bị lỗi về trạng thái chờ gửi lại.');
    } catch {
      setToast('Không đưa được mục về hàng đợi chờ.');
    } finally {
      setSyncing(false);
    }
  };

  const cleanupCache = () => {
    setToast('Đã dọn dẹp bộ nhớ đệm của các mục đã đồng bộ.');
  };

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Đồng Bộ" />}>
      <View style={styles.titleRow}>
        <View style={styles.titleGroup}>
          <MaterialIcons name="sync" size={22} color={colors.primary} />
          <Text style={[typography.titleLg, styles.pageTitle]}>Đồng bộ dữ liệu</Text>
        </View>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} onPress={refresh}>
          <MaterialIcons name="refresh" size={20} color={colors.secondary} />
        </Pressable>
      </View>

      <View style={styles.segments}>
        {(Object.keys(SEGMENT_LABELS) as SyncSegment[]).map((key) => {
          const active = key === segment;
          return (
            <Pressable
              key={key}
              style={[styles.segment, active && styles.segmentActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setSegment(key)}
            >
              <Text style={[typography.labelSm, active ? styles.segmentLabelActive : styles.segmentLabel]}>
                {SEGMENT_LABELS[key]} ({counts[key]})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.statusCard}>
        <View style={styles.statusTop}>
          <View style={styles.statusInfo}>
            <View style={[styles.statusDot, counts.pending === 0 && styles.statusDotClear]} />
            <Text style={[typography.labelLg, styles.statusText]}>
              {counts.pending} mục đang chờ đồng bộ
            </Text>
          </View>
          <View style={styles.networkRow}>
            <MaterialIcons name="wifi" size={15} color={colors.success} />
            <Text style={[typography.labelSm, styles.networkText]}>4G/Wi-Fi kết nối</Text>
          </View>
        </View>
        <Text style={[typography.bodyMd, styles.statusDesc]}>
          Chỉ qua Wi-Fi / 4G khả dụng. Các tác vụ trường hiện trường sẽ được ưu tiên theo thứ tự thực hiện.
        </Text>
        <View style={styles.syncBtnWrap}>
          <Button
            variant="primary"
            title="Đồng bộ ngay"
            loading={syncing}
            disabled={counts.pending === 0}
            onPress={syncNow}
            disabledStyle={styles.syncDisabled}
            disabledTextStyle={styles.syncDisabledText}
          />
          {counts.pending === 0 ? (
            <Text style={[typography.caption, styles.syncAllDone]}>
              Dữ liệu hiện trường đã đồng bộ hoàn toàn với máy chủ.
            </Text>
          ) : null}
        </View>
      </Card>

      {segment === 'pending' ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[typography.labelSm, styles.sectionTitle]}>MỤC CẦN TẢI LÊN</Text>
            <Text style={[typography.caption, styles.sectionHint]}>Tự động khi có mạng</Text>
          </View>

          {visibleItems.map((item) => (
            <Card key={item.id ?? item.name} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <View style={styles.itemContent}>
                  <Text style={[typography.labelLg, styles.itemName]}>{item.name}</Text>
                  <Text style={[typography.caption, styles.itemMeta]}>{item.meta}</Text>
                </View>
                <View style={styles.itemSide}>
                  <StatusBadge status={item.status} />
                  {item.status === SyncStatus.INVALID ? (
                    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]} onPress={retry}>
                      <MaterialIcons name="refresh" size={16} color={colors.secondary} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <Text style={[typography.caption, styles.itemSize]}>{item.size}</Text>
              {item.progress != null ? (
                <View style={styles.progressWrap}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
                  </View>
                  <Text style={[typography.labelSm, styles.progressText]}>{item.progress}%</Text>
                </View>
              ) : null}
            </Card>
          ))}

          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <MaterialIcons name="verified-user" size={22} color={colors.brandGold} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[typography.labelLg, styles.infoTitle]}>Bảo toàn dữ liệu ngoại tuyến</Text>
                <Text style={[typography.caption, styles.infoDesc]}>
                  Dữ liệu sửa chữa và hình ảnh nghiệm thu được lưu an toàn tại bộ nhớ thiết bị. Hệ thống sẽ tự động
                  đồng bộ ngay khi phát hiện kết nối mạng ổn định hoặc khi bấm “Đồng bộ ngay”.
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.cacheCard}>
            <View style={styles.cacheRow}>
              <View style={styles.cacheIcon}>
                <MaterialIcons name="storage" size={22} color={colors.brandGold} />
              </View>
              <View style={styles.cacheContent}>
                <Text style={[typography.labelLg, styles.cacheTitle]}>Bộ nhớ đệm hiện trường</Text>
                <Text style={[typography.caption, styles.cacheDesc]}>2.1 GB còn trống trên máy</Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.cleanupBtn, pressed && styles.cleanupPressed]} onPress={cleanupCache}>
              <Text style={[typography.labelSm, styles.cleanupText]}>DỌN DẸP</Text>
            </Pressable>
          </Card>
        </>
      ) : (
        <EmptyState
          icon="sync"
          title="Đã đồng bộ xong"
          message="Toàn bộ dữ liệu hiện trường đã được đồng bộ lên máy chủ."
        />
      )}

      {toast ? <Toast type="success" message={toast} /> : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageTitle: {
    color: colors.neutral,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  segments: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    backgroundColor: colors.border,
    borderRadius: radius.lg,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentLabel: {
    color: colors.secondary,
  },
  segmentLabelActive: {
    color: colors.neutral,
  },
  statusCard: {
    marginBottom: spacing.lg,
  },
  statusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.warning,
  },
  statusDotClear: {
    backgroundColor: colors.success,
  },
  statusText: {
    color: colors.neutral,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  networkText: {
    color: colors.success,
  },
  statusDesc: {
    color: colors.secondary,
    marginTop: spacing.sm,
  },
  syncBtnWrap: {
    marginTop: spacing.md,
  },
  syncDisabled: {
    backgroundColor: colors.border,
    opacity: 1,
  },
  syncDisabledText: {
    color: '#A0AEC0',
  },
  syncAllDone: {
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.secondary,
  },
  sectionHint: {
    color: colors.secondary,
  },
  itemCard: {
    marginBottom: spacing.sm,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    color: colors.neutral,
  },
  itemMeta: {
    color: colors.secondary,
    marginTop: 2,
  },
  itemSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  retryBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSize: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  progressText: {
    color: colors.primaryDark,
  },
  infoCard: {
    marginTop: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: colors.neutral,
  },
  infoDesc: {
    color: colors.secondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  cacheCard: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cacheRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  cacheIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cacheContent: {
    flex: 1,
  },
  cacheTitle: {
    color: colors.neutral,
  },
  cacheDesc: {
    color: colors.secondary,
    marginTop: 2,
  },
  cleanupBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  cleanupPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  cleanupText: {
    color: colors.primaryDark,
    letterSpacing: 0.04,
  },
});