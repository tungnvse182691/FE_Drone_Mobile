import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { StatusBadge } from '../../src/components/StatusBadge';
import { EmptyState } from '../../src/components/EmptyState';
import { Toast } from '../../src/components/Toast';
import { initDatabase, openDatabase } from '../../src/offline/database';
import { decodeOutboxPayload, currentQueueIdentity, sameQueueIdentity, createQueueReader, queueChecksumLabel, QUEUE_CONTRACT_NOTICE, type QueueIdentity, type OutboxItem } from '../../src/offline/upload-queue';
import { isLegacyRepairQueueEntry } from '../../src/api/crewApi';
import { useAuthStore } from '../../src/store/auth';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { LocalState, SyncStatus } from '../../src/types/enums';

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

const OUTBOX_KIND_LABELS: Record<string, string> = {
  // Canonical — Phần 5.3 (bộ 6 OfflineOperationKind)
  FIELD_ACCEPT: 'Tiếp nhận nhiệm vụ hiện trường',
  FIELD_START: 'Bắt đầu đo kiểm hiện trường',
  FIELD_SUBMISSION: 'Nộp kết quả đo / báo lỗi phát sinh',
  REPAIR_ASSESSMENT: 'Đánh giá hạng mục sửa chữa',
  REPAIR_EXECUTION_START: 'Bắt đầu sửa chữa',
  REPAIR_EXECUTION_FINISH: 'Nộp kết quả sửa chữa',
  // Legacy — row cũ ghi trước Phần 5.3 (vẫn hiển thị đúng nhãn)
  DEFECT_REPORT: 'Báo lỗi phát sinh',
  INSPECTION_SUBMIT: 'Nộp kết quả đo',
  REPAIR_START: 'Bắt đầu sửa chữa',
  REPAIR_SUBMIT: 'Nộp kết quả sửa chữa',
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
  [LocalState.ACKED]: SyncStatus.QUEUED, // Legacy ACK alone is not a verified receipt.
};

/** Compatibility guard: classification never mutates durable history. No dispatch capability. */
export async function quarantineLegacyRepairQueue(_db: SQLite.SQLiteDatabase, identity = currentQueueIdentity()): Promise<void> {
  if(!identity || !sameQueueIdentity(identity))throw Error('queue_session_required');
}

/** Legacy classification helper only; it grants no dispatch capability. */
export function crewSyncPayload(item: OutboxItem): Record<string, unknown> {
  const payload: unknown = JSON.parse(decodeOutboxPayload(item));
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || isLegacyRepairQueueEntry(item.kind, payload)) {
    throw new Error('Repair legacy đang bị khóa; dữ liệu được giữ để đối soát.');
  }
  return payload as Record<string, unknown>;
}

export default function CrewSyncScreen() {
  useAuthStore(s=>s.token);useAuthStore(s=>s.user);useAuthStore(s=>s.status);
  const identity=currentQueueIdentity();
  if(!identity||identity.role!=='REPAIR_CREW')return <SafeAreaScreen header={<AppHeader subtitle="Đồng bộ" />}><Text>Cần phiên Crew hợp lệ.</Text></SafeAreaScreen>;
  return <CrewSyncContent key={JSON.stringify(identity)} identity={identity} />;
}
function CrewSyncContent({identity}:{identity:QueueIdentity}) {
  const [segment, setSegment] = useState<SyncSegment>('pending');
  const [toast, setToast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [outboxRows, setOutboxRows] = useState<OutboxItem[]>([]);
  const reader=useMemo(()=>createQueueReader(identity),[identity]),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;reader.cancel();};},[reader]);
  const active=()=>mounted.current&&sameQueueIdentity(identity);

  useEffect(() => {
    let cancelled = false;
    let database: SQLite.SQLiteDatabase;
    try {
      database = openDatabase();
    } catch {
      setToast('Không mở được cơ sở dữ liệu cục bộ để đọc hàng đợi.');
      return;
    }

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
    if(!db)return;
    try{const rows=await reader.read(db);if(rows&&active())setOutboxRows(rows);}
    catch{if(active())setToast('Không đọc được hàng đợi; dữ liệu vẫn được giữ.');}
  },[db,reader]);
  useEffect(()=>{void reload();},[reload]);
  const syncNow=useCallback(async()=>{
    if(!db||!active())return;setSyncing(true);
    try{await reload();if(active())setToast(QUEUE_CONTRACT_NOTICE);}
    finally{if(active())setSyncing(false);}
  },[db,reload,identity]);

  const queueItems = useMemo<QueueItem[]>(() => {
    if (outboxRows.length > 0) {
      return outboxRows.map((row) => ({
        id: row.id,
        name: OUTBOX_KIND_LABELS[row.kind] ?? row.kind,
        meta: `${row.stored_status ?? row.status}${row.ack_verification === 'UNVERIFIED_LEGACY' || row.status === LocalState.ACKED ? ' — ACK lịch sử chưa xác minh receipt Backend' : ''}. ${row.last_error ? `Lỗi: ${row.last_error}` : queueChecksumLabel(row.checksum_sha256)}`,
        size: `Lần thử ${row.attempt}/${row.max_attempts}`,
        status: row.status === LocalState.ACKED ? SyncStatus.QUEUED : LOCAL_STATE_TO_SYNC_STATUS[row.status] ?? SyncStatus.QUEUED,
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

  

  const refresh=()=>{void reload();};
  const retry=()=>{if(active())setToast(QUEUE_CONTRACT_NOTICE);};
  const cleanupCache=()=>{if(active())setToast('Chưa có bằng chứng đối soát để xóa bản sao. Dữ liệu được giữ nguyên.');};

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
              <Text style={[typography.labelLg, active ? styles.segmentLabelActive : styles.segmentLabel]}>
                {SEGMENT_LABELS[key]} ({counts[key]})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.statusCard}>
        <View style={styles.statusHero}>
          <View style={styles.heroIcon}>
            <MaterialIcons
              name={counts.pending === 0 ? 'check-circle' : 'sync'}
              size={28}
              color={counts.pending === 0 ? colors.success : colors.brandGold}
            />
          </View>
          <View style={styles.heroBody}>
            <Text style={[typography.titleMd, styles.statusText]}>
              {counts.pending} mục đang chờ đồng bộ
            </Text>
            <View style={styles.networkRow}>
              <MaterialIcons name="wifi" size={14} color={colors.success} />
              <Text style={[typography.caption, styles.networkText]}>Trạng thái mạng chưa được đo</Text>
            </View>
          </View>
        </View>
        <Text style={[typography.bodyMd, styles.statusDesc]}>
          {QUEUE_CONTRACT_NOTICE} Bản ghi local/không chứng minh được chủ sở hữu được giữ riêng và không hiển thị trong phiên này.
        </Text>
        <View style={styles.heroDivider} />
        <View style={styles.syncBtnWrap}>
          <Button
            variant="primary"
            title="Kiểm tra hàng đợi bị khóa"
            loading={syncing}
            disabled={counts.pending === 0}
            onPress={syncNow}
            disabledStyle={styles.syncDisabled}
            disabledTextStyle={styles.syncDisabledText}
          />
          {counts.pending === 0 ? (
            <Text style={[typography.caption, styles.syncAllDone]}>
              Không có mục trong phân vùng tài khoản này. Không suy ra đã đồng bộ dữ liệu legacy.
            </Text>
          ) : null}
        </View>
      </Card>

      {segment === 'pending' ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[typography.labelSm, styles.sectionTitle]}>MỤC CẦN TẢI LÊN</Text>
            <Text style={[typography.caption, styles.sectionHint]}>Chưa có dispatch ký hợp lệ</Text>
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
                <MaterialIcons name="verified-user" size={24} color={colors.brandGold} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[typography.labelLg, styles.infoTitle]}>Bảo toàn dữ liệu ngoại tuyến</Text>
                <Text style={[typography.caption, styles.infoDesc]}>
                  Dữ liệu sửa chữa và hình ảnh nghiệm thu được lưu an toàn tại bộ nhớ thiết bị. Đồng bộ legacy đang khóa; chưa gửi mạng hay nhận xác nhận từ máy chủ.
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.cacheCard}>
            <View style={styles.cacheRow}>
              <View style={styles.cacheIcon}>
                <MaterialIcons name="storage" size={24} color={colors.brandGold} />
              </View>
              <View style={styles.cacheContent}>
                <Text style={[typography.labelLg, styles.cacheTitle]}>Bộ nhớ đệm hiện trường</Text>
                <Text style={[typography.caption, styles.cacheDesc]}>Chưa đo dung lượng thiết bị</Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.cleanupBtn, pressed && styles.cleanupPressed]} onPress={cleanupCache}>
              <Text style={[typography.labelSm, styles.cleanupText]}>DỌN DẸP</Text>
            </Pressable>
          </Card>
        </>
      ) : counts.done > 0 ? (
        <EmptyState
          icon="sync"
          title="Đã đồng bộ xong"
          message="Chưa có receipt hợp lệ để xác nhận dữ liệu legacy."
        />
      ) : (
        <EmptyState
          icon="cloud-off"
          title="Chưa có dữ liệu"
          message="Chưa có mục nào được đồng bộ lên máy chủ."
        />
      )}

      {toast ? <Toast type="info" message={toast} /> : null}
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
    height: 50,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: spacing.xs,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1D20',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  segment: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentLabel: {
    color: colors.secondary,
  },
  segmentLabelActive: {
    color: colors.onPrimary,
  },
  statusCard: {
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1D20',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statusHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroBody: {
    flex: 1,
    gap: spacing.xs,
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
  heroDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.md,
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
    borderRadius: radius.xl,
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1D20',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 3,
      },
    }),
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
    borderRadius: radius.xl,
    marginTop: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1D20',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 3,
      },
    }),
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
    borderRadius: radius.xl,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1D20',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 3,
      },
    }),
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
