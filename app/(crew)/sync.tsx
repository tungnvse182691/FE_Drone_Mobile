import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CrewContentTransition, CrewPressable as Pressable } from '../../src/components/crew/CrewMotion';
import { MaterialIcons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Toast } from '../../src/components/Toast';
import { initDatabase, openDatabase } from '../../src/offline/database';
import { decodeOutboxPayload, currentQueueIdentity, sameQueueIdentity, createQueueReader, type QueueIdentity, type OutboxItem } from '../../src/offline/upload-queue';
import { isLegacyRepairQueueEntry } from '../../src/api/crewApi';
import { useAuthStore } from '../../src/store/auth';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { CrewOfflinePanel } from '../../src/components/crew/CrewOfflinePanel';
import { CrewLocalDraftPanel } from '../../src/components/crew/CrewLocalDraftPanel';
import { CREW_HANDOVER } from '../../src/constants/routes';
import { subscribeToCrewHandoverChange } from '../../src/store/crewHandoverRefresh';

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

export function crewQueueStateLabel(state: string): string {
  const labels: Record<string,string> = { DRAFT:'Bản nháp',WAITING_DEPENDENCIES:'Chờ dữ liệu liên quan',READY:'Chờ xử lý',IN_FLIGHT:'Đang xử lý, chưa xác nhận',PAUSED_RETRY:'Đang tạm dừng',UNKNOWN_OUTCOME:'Chưa rõ kết quả',AUTH_REQUIRED:'Cần xác thực lại',BLOCKED_CONTRACT:'Chưa hỗ trợ gửi',CONFLICT:'Cần đối soát dữ liệu',REJECTED:'Máy chủ từ chối',ACKED:'Phản hồi cũ chưa được đối soát' };
  return labels[state] ?? 'Chưa xác nhận kết quả';
}

/** Compatibility guard: classification never mutates durable history. No dispatch capability. */
export async function quarantineLegacyRepairQueue(_db: SQLite.SQLiteDatabase, identity = currentQueueIdentity()): Promise<void> {
  if(!identity || !sameQueueIdentity(identity))throw Error('queue_session_required');
}

/** Legacy classification helper only; it grants no dispatch capability. */
export function crewSyncPayload(item: OutboxItem): Record<string, unknown> {
  const payload: unknown = JSON.parse(decodeOutboxPayload(item));
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || isLegacyRepairQueueEntry(item.kind, payload)) {
    throw new Error('Lệnh sửa chữa cũ đang bị khóa; dữ liệu được giữ để đối soát.');
  }
  return payload as Record<string, unknown>;
}

export default function CrewSyncScreen() {
  useAuthStore(s=>s.token);useAuthStore(s=>s.user);useAuthStore(s=>s.status);
  const identity=currentQueueIdentity();
  if(!identity||identity.role!=='REPAIR_CREW')return <SafeAreaScreen header={<AppHeader subtitle="Đồng bộ" />}><Text>Cần phiên đội sửa chữa hợp lệ.</Text></SafeAreaScreen>;
  return <CrewSyncContent key={JSON.stringify(identity)} identity={identity} />;
}
function CrewSyncContent({ identity }: { identity: QueueIdentity }) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [outboxRows, setOutboxRows] = useState<OutboxItem[]>([]);
  const [showLegacy, setShowLegacy] = useState(false);
  const [panelRefreshSignal, setPanelRefreshSignal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlight = useRef(false);
  const reader = useMemo(() => createQueueReader(identity), [identity]);
  const mounted = useRef(true);
  const active = useCallback(() => mounted.current && sameQueueIdentity(identity), [identity]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; reader.cancel(); };
  }, [reader]);

  useEffect(() => {
    let cancelled = false;
    const open = async () => {
      try {
        const database = openDatabase();
        await initDatabase(database);
        if (!cancelled && active()) setDb(database);
      } catch {
        if (!cancelled && active()) setToast('Không đọc được hồ sơ cũ trên thiết bị.');
      }
    };
    void open();
    return () => { cancelled = true; };
  }, [active]);

  const reload = useCallback(async () => {
    if (!db || !active()) return;
    try {
      const rows = await reader.read(db);
      if (rows && active()) setOutboxRows(rows);
    } catch {
      if (active()) setToast('Không đọc được hồ sơ cũ. Dữ liệu vẫn được giữ trên máy.');
    }
  }, [db, reader, active]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  useFocusEffect(useCallback(() => subscribeToCrewHandoverChange(changedIdentity => {
    if (!active() || !sameQueueIdentity(changedIdentity, identity)) return;
    setPanelRefreshSignal(value => value + 1);
    void reload();
  }), [active, identity, reload]));

  const refresh = async () => {
    if (refreshInFlight.current || !active()) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    setPanelRefreshSignal(value => value + 1);
    try { await reload(); }
    finally {
      refreshInFlight.current = false;
      if (active()) setRefreshing(false);
    }
  };

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Đồng bộ" />}>
      <CrewContentTransition ready>
        <View style={styles.titleRow}>
          <View style={styles.titleGroup}>
            <Text style={styles.pageTitle}>Đồng bộ dữ liệu</Text>
            <Text style={styles.caption}>Chưa xác định trạng thái kết nối</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Tải lại trạng thái đồng bộ"
            accessibilityState={{ busy: refreshing, disabled: refreshing }} disabled={refreshing} style={styles.refresh} onPress={refresh}>
            {refreshing ? <ActivityIndicator size="small" color={colors.brandGold} /> : <MaterialIcons name="refresh" size={20} color={colors.brandGold} />}
            <Text style={styles.label}>{refreshing ? 'Đang đọc…' : 'Tải lại'}</Text>
          </Pressable>
        </View>

        <CrewOfflinePanel identity={identity} refreshSignal={panelRefreshSignal} />
        <CrewLocalDraftPanel identity={identity} refreshSignal={panelRefreshSignal} />
        <Card style={styles.support}>
          <Text style={styles.sectionTitle}>Hỗ trợ và khôi phục</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Bàn giao hồ sơ" style={styles.supportRow} onPress={() => {
            if (active()) router.navigate(CREW_HANDOVER);
          }}>
            <MaterialIcons name="lock-outline" size={22} color={colors.brandGold} />
            <View style={styles.rowBody}>
              <Text style={styles.label}>Bàn giao hồ sơ</Text>
              <Text style={styles.caption}>Gửi hoặc nhận hồ sơ đã ký</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.secondary} />
          </Pressable>
          {outboxRows.length > 0 ? <>
            <Pressable accessibilityRole="button" accessibilityLabel="Hồ sơ cũ cần đối soát" accessibilityState={{ expanded: showLegacy }}
              style={styles.supportRow} onPress={() => setShowLegacy(value => !value)}>
              <MaterialIcons name="history" size={22} color={colors.brandGold} />
              <Text style={[styles.label, styles.rowBody]}>Hồ sơ cũ cần đối soát ({outboxRows.length})</Text>
              <MaterialIcons name={showLegacy ? 'expand-less' : 'expand-more'} size={22} color={colors.secondary} />
            </Pressable>
            {showLegacy ? <View style={styles.legacyList}>
              <Text style={styles.caption}>Các mục này được giữ trên máy để kiểm tra với người phụ trách.</Text>
              {outboxRows.map(row => <View key={row.id} style={styles.legacyItem}>
                <Text style={styles.label}>{OUTBOX_KIND_LABELS[row.kind] ?? 'Thao tác đã lưu'}</Text>
                <Text style={styles.caption}>{crewQueueStateLabel(row.stored_status ?? row.status)}</Text>
                {row.last_error ? <Text style={styles.caption}>Lần xử lý trước chưa hoàn tất.</Text> : null}
                {!/^[a-f0-9]{64}$/i.test(row.checksum_sha256 ?? '') ? <Text style={styles.caption}>Cần kiểm tra tính toàn vẹn của hồ sơ.</Text> : null}
              </View>)}
            </View> : null}
          </> : null}
        </Card>
        {toast ? <Toast type="info" message={toast} /> : null}
      </CrewContentTransition>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  titleGroup: { flexGrow: 1, flexBasis: 170, flexShrink: 1, gap: spacing.xs },
  pageTitle: { ...typography.titleLg, color: colors.neutral },
  refresh: { minWidth: 48, minHeight: 48, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  support: { borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  sectionTitle: { ...typography.titleMd, color: colors.neutral },
  supportRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  rowBody: { flex: 1, gap: spacing.xs },
  label: { ...typography.labelLg, color: colors.neutral },
  caption: { ...typography.caption, color: colors.secondary },
  legacyList: { gap: spacing.sm, padding: spacing.sm },
  legacyItem: { gap: spacing.xs, borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.sm },
});
