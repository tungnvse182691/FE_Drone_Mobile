import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { initDatabase, openDatabase } from '../../src/offline/database';
import {
  decodeOutboxPayload,
  getActivePartition,
  processQueue,
  recoverInFlight,
  type OperationReceipt,
  type OutboxItem,
} from '../../src/offline/upload-queue';
import { apiClient } from '../../src/api/client';
import { getDeviceId } from '../../src/constants/device';
import { stableUuid } from '../../src/utils/uuid';
import { LocalState } from '../../src/types/enums';
import {
  SYNC_OUTCOME_TO_LOCAL_STATE,
  isDispatchableSyncOperationKind,
  type SyncOperation,
  type SyncResult,
} from '../../src/types/domain';

/** Map `LocalState` → nhãn tiếng Việt + nhóm hiển thị. Không suy diễn trạng thái từ timer. */
const STATE_PRESENTATION: Record<
  string,
  { label: string; tone: 'pending' | 'done' | 'blocked' }
> = {
  [LocalState.DRAFT]: { label: 'Bản nháp', tone: 'pending' },
  [LocalState.WAITING_DEPENDENCIES]: { label: 'Chờ phụ thuộc', tone: 'pending' },
  [LocalState.READY]: { label: 'Sẵn sàng gửi', tone: 'pending' },
  [LocalState.IN_FLIGHT]: { label: 'Đang gửi', tone: 'pending' },
  [LocalState.PAUSED_RETRY]: { label: 'Tạm hoãn, sẽ thử lại', tone: 'pending' },
  [LocalState.AUTH_REQUIRED]: { label: 'Cần đăng nhập lại', tone: 'blocked' },
  [LocalState.BLOCKED_CONTRACT]: { label: 'Thiếu dữ liệu hợp đồng', tone: 'blocked' },
  [LocalState.CONFLICT]: { label: 'Xung đột phiên bản', tone: 'blocked' },
  [LocalState.REJECTED]: { label: 'Máy chủ từ chối', tone: 'blocked' },
  [LocalState.UNKNOWN_OUTCOME]: { label: 'Chưa rõ kết quả', tone: 'blocked' },
  [LocalState.ACKED]: { label: 'Đã đối soát SHA-256', tone: 'done' },
};

/**
 * Outbox lưp `kind` theo tên thao tác nội bộ (`submit_dataset`, `accept_survey_task`, …),
 * KHÔNG phải `kind` canonical của SyncOperation (`INSPECTION_SUBMIT`, `REPAIR_START`,
 * `REPAIR_SUBMIT`). Kind không nằm trong `RUNTIME_SYNC_OPERATION_KINDS` thì không được gửi —
 * giữ BLOCKED_CONTRACT thay vì ép kiểu để lách schema. Xem `src/types/domain.ts`.
 */

const KIND_ICON: Record<string, 'videocam' | 'photo-library' | 'description'> = {
  submit_dataset: 'videocam',
  submit_inspection: 'description',
  submit_repair: 'description',
  start_measurement: 'description',
};

interface SyncItem {
  id: string;
  name: string;
  meta: string;
  type: 'video' | 'photo' | 'form';
  tone: 'pending' | 'done' | 'blocked';
  statusText: string;
  sha256: string;
}

function kindToType(kind: string): SyncItem['type'] {
  return KIND_ICON[kind] === 'videocam'
    ? 'video'
    : KIND_ICON[kind] === 'photo-library'
      ? 'photo'
      : 'form';
}

function describeItem(row: OutboxItem): SyncItem {
  const presentation = STATE_PRESENTATION[row.status] ?? {
    label: row.status,
    tone: 'blocked' as const,
  };
  let title = row.kind;
  let meta = `${presentation.label} · lần thử ${row.attempt}`;
  try {
    const payload = JSON.parse(decodeOutboxPayload(row)) as Record<string, unknown>;
    const name = (payload.videoName ?? payload.name ?? payload.taskId ?? null) as string | null;
    if (name) {
      title = name;
    }
    const task = (payload.surveyTaskCode ?? payload.taskId ?? null) as string | null;
    if (task) {
      meta = `${task} · ${presentation.label}`;
    }
    if (row.last_error) {
      meta = `${meta} · ${row.last_error}`;
    }
  } catch {
    meta = `${presentation.label} · payload không đọc được`;
  }
  return {
    id: row.id,
    name: title,
    meta,
    type: kindToType(row.kind),
    tone: presentation.tone,
    statusText: presentation.label,
    sha256: row.checksum_sha256,
  };
}

/** Đọc outbox của partition đang hoạt động — nguồn duy nhất cho UI và thống kê sau sync. */
async function readOutbox(database: SQLite.SQLiteDatabase): Promise<OutboxItem[]> {
  return database.getAllAsync<OutboxItem>(
    `SELECT id, kind, payload_b64 AS data_b64, checksum_sha256, local_state AS status,
            attempt, '5' AS max_attempts, last_error, created_at, updated_at,
            partition_id, task_id, expected_version
       FROM offline_outbox
      WHERE partition_id = ?
      ORDER BY created_at DESC`,
    [getActivePartition()],
  );
}

export default function DroneSyncScreen() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [queueTab, setQueueTab] = useState<'pending' | 'completed'>('pending');
  const [outboxRows, setOutboxRows] = useState<OutboxItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [purgedCount, setPurgedCount] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const database = openDatabase();
        await initDatabase(database);
        if (!cancelled) {
          setDb(database);
        }
      } catch {
        if (!cancelled) {
          setToastMsg('Không mở được kho dữ liệu cục bộ.');
        }
      }
    })();
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
      setOutboxRows(await readOutbox(db));
    } catch {
      setToastMsg('Không đọc được hàng đợi đồng bộ cục bộ.');
    }
  }, [db]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const pendingQueue = useMemo(
    () => outboxRows.filter((row) => row.status !== LocalState.ACKED).map(describeItem),
    [outboxRows],
  );
  const completedQueue = useMemo(
    () => outboxRows.filter((row) => row.status === LocalState.ACKED).map(describeItem),
    [outboxRows],
  );
  const activeItems = queueTab === 'pending' ? pendingQueue : completedQueue;
  /** Chỉ các mục có kind dispatchable mới đồng bộ được; kind nội bộ giữ BLOCKED_CONTRACT. */
  const dispatchableRows = useMemo(
    () => outboxRows.filter((row) => isDispatchableSyncOperationKind(row.kind)),
    [outboxRows],
  );

  const handleSyncAll = useCallback(async () => {
    if (!db) {
      showToast('Chưa mở được kho dữ liệu cục bộ.');
      return;
    }
    if (outboxRows.length === 0) {
      showToast('Hàng đợi trống, không có gì để đồng bộ.');
      return;
    }
    setSyncing(true);
    const dispatchable = outboxRows.filter((row) => isDispatchableSyncOperationKind(row.kind));
    showToast(`Đang gửi ${dispatchable.length} mục trong hàng đợi…`);
    try {
      await processQueue(db, async (item) => {
        if (!isDispatchableSyncOperationKind(item.kind)) {
          // Không có kind canonical ⇒ không dựng được SyncOperation hợp lệ. Giữ trong hàng đợi.
          return [
            {
              operationId: item.id,
              localState: LocalState.BLOCKED_CONTRACT,
              errorCode: 'UNMAPPED_OPERATION_KIND',
              errorMessage: `Kind "${item.kind}" chưa ánh xạ sang SyncOperation canonical.`,
            },
          ];
        }
        const payload = JSON.parse(decodeOutboxPayload(item)) as Record<string, unknown>;
        // Contract canonical `SyncBatch`: additionalProperties=false, cần deviceId + operations (1..100).
        const operation: SyncOperation = {
          operationId: item.id,
          kind: item.kind,
          expectedVersion: item.expected_version ?? '0',
          capturedAt: String(payload.capturedAt ?? item.created_at),
          ...(item.task_id ? { taskId: item.task_id } : {}),
          payload,
        } as SyncOperation;
        const response = await apiClient.post<SyncResult>(
          '/sync/batches',
          { deviceId: getDeviceId(), operations: [operation] },
          { headers: { 'X-Operation-Id': stableUuid(`sync:${item.id}`) } },
        );
        const results = response.data?.results;
        if (!Array.isArray(results) || results.length === 0) {
          // Envelope không hợp lệ ⇒ KHÔNG ACK.
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
      // Đếm lại từ DB sau khi reload — `outboxRows` trong closure là snapshot cũ.
      const fresh = await readOutbox(db);
      const pending = fresh.filter((row) => row.status !== LocalState.ACKED).length;
      showToast(
        pending === 0
          ? 'Máy chủ đã xác nhận toàn bộ mục trong hàng đợi.'
          : `Còn ${pending} mục chưa được máy chủ xác nhận.`,
      );
    } catch {
      await reload();
      showToast('Không gửi được lên máy chủ. Hàng đợi được giữ nguyên để thử lại.');
    } finally {
      setSyncing(false);
    }
  }, [db, outboxRows, reload, showToast]);

  const handleSafePurge = useCallback(async () => {
    if (!db) {
      showToast('Chưa mở được kho dữ liệu cục bộ.');
      return;
    }
    try {
      // `media_assets.id` và `offline_outbox.id` là hai UUID độc lập — KHÔNG join được
      // với nhau. Liên kết duy nhất đáng tin là `uri_local` trong payload của mục đã ACK.
      // Vì vậy chỉ xóa bản sao thuộc partition đang hoạt động mà media_state đã ở
      // trạng thái kết thúc vòng đời (đã đối soát / đã tải lên xong).
      const result = await db.runAsync(
        `DELETE FROM media_assets
          WHERE partition_id = ?
            AND media_state IN (?, ?)`,
        getActivePartition(),
        'ACKED',
        'UPLOADED',
      );
      const removed = result.changes;
      setPurgedCount(removed);
      showToast(
        removed === 0
          ? 'Chưa có bản sao nào được giải phóng vì chưa đối soát xong.'
          : `Đã giải phóng an toàn ${removed} bản sao đã đối soát.`,
      );
    } catch {
      showToast('Không đối soát được bản sao cục bộ.');
    }
  }, [db, showToast]);

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Đồng bộ ngoại tuyến" />}>
      {/* Toast Notification */}
      {toastMsg && (
        <View style={styles.toast}>
          <MaterialIcons name="info" size={18} color={colors.surface} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* Switcher */}
      <View style={styles.headerRow}>
        <Text style={[typography.labelSm, styles.headerTitle]}>HÀNG ĐỢI ĐỒNG BỘ NỀN</Text>
        <View style={styles.tabToggle}>
          <Pressable
            style={[styles.toggleBtn, queueTab === 'pending' && styles.toggleBtnActive]}
            onPress={() => setQueueTab('pending')}
          >
            <Text
              style={[styles.toggleBtnText, queueTab === 'pending' && styles.toggleBtnTextActive]}
            >
              Đang chờ ({pendingQueue.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.toggleBtn, queueTab === 'completed' && styles.toggleBtnActive]}
            onPress={() => setQueueTab('completed')}
          >
            <Text
              style={[styles.toggleBtnText, queueTab === 'completed' && styles.toggleBtnTextActive]}
            >
              Đã xong ({completedQueue.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Summary & Single CTA */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryInfo}>
          <View style={styles.syncPulseRow}>
            <View
              style={[
                styles.pulseDot,
                pendingQueue.length === 0 && { backgroundColor: colors.success },
              ]}
            />
            <Text style={[typography.titleMd, styles.summaryCount]}>
              {pendingQueue.length > 0
                ? `${pendingQueue.length} tệp đang chờ đồng bộ`
                : 'Đã hoàn tất mọi tệp đồng bộ'}
            </Text>
          </View>
          <Text style={[typography.caption, styles.totalSize]}>
            {pendingQueue.length > 0
              ? `${pendingQueue.length} mục chờ đồng bộ`
              : `${completedQueue.length} mục đã xác nhận`}
          </Text>
        </View>

        <Button
          variant="primary"
          title={
            syncing
              ? 'Đang gửi lên máy chủ…'
              : pendingQueue.length > 0
              ? 'Đồng bộ tất cả ngay'
              : outboxRows.length === 0
              ? 'Hàng đợi trống'
              : 'Đã đồng bộ đầy đủ'
          }
          loading={syncing}
          disabled={dispatchableRows.length === 0 || syncing}
          onPress={handleSyncAll}
        />
      </Card>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.labelSm, styles.sectionTitle]}>
          {queueTab === 'pending' ? 'DANH SÁCH TỆP CHỜ TẢI' : 'TỆP ĐÃ XÁC NHẬN TOÀN VẸN (SERVER)'}
        </Text>
        <Text style={[typography.caption, styles.sectionSub]}>
          {queueTab === 'pending' ? 'Tự động tải khi có Wi-Fi/4G' : 'Khớp mã băm SHA-256'}
        </Text>
      </View>

      {/* Queue Items */}
      <View style={styles.itemsList}>
        {activeItems.length === 0 ? (
          <Card style={styles.emptyCard}>
            <MaterialIcons name="check-circle" size={36} color={colors.success} />
            <Text style={[typography.bodyMd, { color: colors.secondary, marginTop: 6 }]}>
              Không có tệp nào trong danh sách
            </Text>
          </Card>
        ) : (
          activeItems.map((item) => (
            <Card key={item.id} style={styles.itemCard}>
              <View style={styles.itemMain}>
                <View style={styles.itemIconWrap}>
                  {item.type === 'video' && (
                    <MaterialIcons name="videocam" size={20} color={colors.primary} />
                  )}
                  {item.type === 'photo' && (
                    <MaterialIcons name="photo-library" size={20} color={colors.info} />
                  )}
                  {item.type === 'form' && (
                    <MaterialIcons name="description" size={20} color={colors.secondary} />
                  )}
                </View>

                <View style={styles.itemInfo}>
                  <Text style={[typography.bodyMd, styles.itemName]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[typography.caption, styles.itemMeta]}>{item.meta}</Text>
                  <Text style={[typography.caption, styles.itemHash]}>SHA: {item.sha256}</Text>
                </View>
              </View>

              <View style={styles.statusBadge}>
                {item.tone === 'pending' && (
                  <View style={styles.queuedPill}>
                    <Text style={styles.queuedText}>{item.statusText}</Text>
                  </View>
                )}
                {item.tone === 'done' && (
                  <View style={styles.confirmedPill}>
                    <MaterialIcons name="verified-user" size={12} color={colors.success} />
                    <Text style={styles.confirmedText}>{item.statusText}</Text>
                  </View>
                )}
                {item.tone === 'blocked' && (
                  <View style={styles.queuedPill}>
                    <MaterialIcons name="report-problem" size={12} color={colors.error} />
                    <Text style={styles.queuedText}>{item.statusText}</Text>
                  </View>
                )}
              </View>
            </Card>
          ))
        )}
      </View>

      {/* Safe Local Purge Section */}
      <Card style={styles.purgeCard}>
        <View style={styles.purgeHeader}>
          <MaterialIcons name="verified" size={20} color={colors.success} />
          <Text style={[typography.labelSm, styles.purgeTitle]}>
            QUY TRÌNH DỌN DẸP BẢN SAO AN TOÀN (SAFE LOCAL PURGE)
          </Text>
        </View>

        <Text style={[typography.bodyMd, styles.purgeDesc]}>
          Ứng dụng hỗ trợ tiếp tục tại điểm ngắt (Auto-resume chunked upload). Bản sao cục bộ trên thẻ SD và bộ nhớ trong chỉ được giải phóng sau khi máy chủ xác nhận nhận đủ bytes và khớp mã SHA-256 100%.
        </Text>

        <Pressable
          style={[styles.purgeBtn, purgedCount > 0 && styles.purgeBtnDisabled]}
          onPress={handleSafePurge}
          disabled={purgedCount > 0}
          accessibilityRole="button"
        >
          <MaterialIcons name="delete" size={16} color={purgedCount > 0 ? colors.secondary : colors.error} />
          <Text style={[typography.labelSm, { color: purgedCount > 0 ? colors.secondary : colors.error }]}>
            {purgedCount > 0
              ? `Đã giải phóng an toàn ${purgedCount} bản sao`
              : 'Dọn dẹp bản sao an toàn sau đối soát'}
          </Text>
        </Pressable>
      </Card>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  toast: {
    backgroundColor: colors.neutral,
    padding: spacing.sm,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  toastText: {
    color: colors.surface,
    fontSize: 12,
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    color: colors.secondary,
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.surfaceAlt,
  },
  toggleBtnText: {
    fontSize: 11,
    color: colors.secondary,
  },
  toggleBtnTextActive: {
    color: colors.neutral,
    fontWeight: 'bold',
  },
  summaryCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  summaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncPulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  summaryCount: {
    color: colors.neutral,
  },
  totalSize: {
    color: colors.secondary,
    fontFamily: 'Roboto',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    color: colors.secondary,
  },
  sectionSub: {
    color: colors.secondary,
  },
  itemsList: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  itemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.xs,
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: colors.neutral,
    fontWeight: '500',
  },
  itemMeta: {
    color: colors.secondary,
    marginTop: 1,
  },
  itemHash: {
    color: colors.secondary,
    fontSize: 10,
    marginTop: 1,
  },
  statusBadge: {
    alignItems: 'flex-end',
  },
  uploadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  uploadingText: {
    color: colors.info,
    fontSize: 10,
    fontWeight: 'bold',
  },
  queuedPill: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  queuedText: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '600',
  },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  confirmedText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  purgeCard: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: colors.border,
  },
  purgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  purgeTitle: {
    color: colors.neutral,
    flex: 1,
  },
  purgeDesc: {
    color: colors.secondary,
    lineHeight: 20,
    fontSize: 12,
  },
  purgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    marginTop: spacing.xs,
  },
  purgeBtnDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
});
