import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});
import { initDatabase, openDatabase } from '../../src/offline/database';
import { currentQueueIdentity, sameQueueIdentity, createQueueReader, queueChecksumLabel, type QueueIdentity, type OutboxItem } from '../../src/offline/upload-queue';
import { useAuthStore } from '../../src/store/auth';
import { LocalState } from '../../src/types/enums';
import { DroneTaskRecoveryList } from '../../src/components/drone/DroneTaskCommandPanel';
import { useOperatorReadScope } from '../../src/hooks/useOperatorReadScope';

/** Map `LocalState` → nhãn tiếng Việt + nhóm hiển thị. Không suy diễn trạng thái từ timer. */
const STATE_PRESENTATION: Record<
  string,
  { label: string; tone: 'pending' | 'done' | 'blocked' }
> = {
  [LocalState.DRAFT]: { label: 'Bản nháp', tone: 'pending' },
  [LocalState.WAITING_DEPENDENCIES]: { label: 'Chờ phụ thuộc', tone: 'pending' },
  [LocalState.READY]: { label: 'Sẵn sàng gửi', tone: 'pending' },
  [LocalState.IN_FLIGHT]: { label: 'Đang gửi', tone: 'pending' },
  [LocalState.PAUSED_RETRY]: { label: 'Tạm hoãn, cần kiểm tra', tone: 'pending' },
  [LocalState.AUTH_REQUIRED]: { label: 'Cần đăng nhập lại', tone: 'blocked' },
  [LocalState.BLOCKED_CONTRACT]: { label: 'Thiếu dữ liệu hợp đồng', tone: 'blocked' },
  [LocalState.CONFLICT]: { label: 'Xung đột phiên bản', tone: 'blocked' },
  [LocalState.REJECTED]: { label: 'Máy chủ từ chối', tone: 'blocked' },
  [LocalState.UNKNOWN_OUTCOME]: { label: 'Chưa rõ kết quả', tone: 'blocked' },
  [LocalState.ACKED]: { label: 'Đã ghi nhận cục bộ — chưa xác minh biên nhận', tone: 'pending' },
};

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
    label: 'Cần kiểm tra trạng thái',
    tone: 'blocked' as const,
  };
  const title = row.kind === 'submit_dataset' ? 'Hồ sơ khảo sát' : 'Bản ghi được lưu trên thiết bị';
  const meta = `${presentation.label} · ${row.attempt} lần gửi đã ghi nhận`;
  return {
    id: row.id,
    name: title,
    meta,
    type: kindToType(row.kind),
    tone: presentation.tone,
    statusText: presentation.label,
    sha256: queueChecksumLabel(row.checksum_sha256),
  };
}

export default function DroneSyncScreen() {
  useAuthStore(s=>s.token);useAuthStore(s=>s.user);useAuthStore(s=>s.status);
  const identity=currentQueueIdentity();
  if(!identity||identity.role!=='DRONE_OPERATOR')return <SafeAreaScreen header={<AppHeader subtitle="Đồng bộ" />}><Text>Cần phiên Operator hợp lệ.</Text></SafeAreaScreen>;
  return <DroneSyncContent key={JSON.stringify(identity)} identity={identity} />;
}
function DroneSyncContent({identity}:{identity:QueueIdentity}) {
  const scope = useOperatorReadScope();
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [queueTab, setQueueTab] = useState<'pending' | 'completed'>('pending');
  const [outboxRows, setOutboxRows] = useState<OutboxItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const purgedCount = 0;
  const reader=useMemo(()=>createQueueReader(identity),[identity]),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;reader.cancel();};},[reader]);
  const active=()=>mounted.current&&sameQueueIdentity(identity);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);

  }, []);

  useEffect(() => {
    let cancelled = false;
    const isCurrent = scope.capture();
    void (async () => {
      try {
        const database = openDatabase();
        await initDatabase(database);
        if (!cancelled && isCurrent()) {
          setDb(database);
        }
      } catch {
        if (!cancelled && isCurrent()) {
          setToastMsg('Không mở được kho dữ liệu cục bộ.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reload=useCallback(async(database:SQLite.SQLiteDatabase|null=db)=>{
    const isCurrent=scope.capture();
    if(!database||!isCurrent())return false;
    try{const rows=await reader.read(database);if(rows&&active()&&isCurrent()){setOutboxRows(rows);return true;}}
    catch{if(active()&&isCurrent())setToastMsg('Không đọc được hàng đợi; dữ liệu vẫn được giữ.');}
    return false;
  },[db,reader,scope.capture]);
  useEffect(()=>{if(db)void reload();},[reload,db]);

  const pendingQueue = useMemo(
    () => outboxRows.filter((row) => row.status !== LocalState.ACKED).map(describeItem),
    [outboxRows],
  );
  const completedQueue = useMemo(
    () => outboxRows.filter((row) => row.status === LocalState.ACKED).map(describeItem),
    [outboxRows],
  );
  const activeItems = queueTab === 'pending' ? pendingQueue : completedQueue;
  const handleSyncAll=useCallback(async()=>{
    const isCurrent=scope.capture();
    if(syncing||!active()||!isCurrent())return;setSyncing(true);
    try{
      let database=db;
      if(!database){database=openDatabase();await initDatabase(database);if(!isCurrent())return;setDb(database);}
      const read=await reload(database);
      if(read&&active()&&isCurrent())showToast('Đã đọc lại dữ liệu trên thiết bị. Thao tác này không gửi hoặc xác minh biên nhận máy chủ.');
    }catch{if(active()&&isCurrent())setToastMsg('Không mở được kho dữ liệu cục bộ. Có thể thử đọc lại; dữ liệu vẫn được giữ.');}
    finally{if(active()&&isCurrent())setSyncing(false);}
  },[db,reload,showToast,identity,syncing,scope.capture]);
  const handleSafePurge=()=>{if(active())showToast('Chưa có receipt đối soát hợp lệ. Không xóa bản sao cục bộ.');};


  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Đồng bộ ngoại tuyến" />}>
      <DroneTaskRecoveryList />
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
              Đã ghi nhận ({completedQueue.length})
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
                { backgroundColor: colors.secondary },
              ]}
            />
            <Text style={[typography.titleMd, styles.summaryCount]}>
              {pendingQueue.length > 0
                ? `${pendingQueue.length} tệp đang chờ đồng bộ`
                : 'Không có mục trong phân vùng này'}
            </Text>
          </View>
          <Text style={[typography.caption, styles.totalSize]}>
            {pendingQueue.length > 0
              ? `${pendingQueue.length} mục chờ đồng bộ`
              : `${completedQueue.length} mục ghi nhận cục bộ`}
          </Text>
        </View>

        <Button
          variant="primary"
          title={syncing ? 'Đang đọc hàng đợi…' : 'Đọc lại hàng đợi'}
          loading={syncing}
          disabled={syncing}
          onPress={handleSyncAll}
        />
      </Card>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.labelSm, styles.sectionTitle]}>
          {queueTab === 'pending' ? 'DANH SÁCH TỆP CHỜ TẢI' : 'BẢN GHI CỤC BỘ'}
        </Text>
        <Text style={[typography.caption, styles.sectionSub]}>
          {queueTab === 'pending' ? 'Yêu cầu vẫn được giữ trên thiết bị' : 'Chưa xác minh biên nhận máy chủ'}
        </Text>
      </View>

      {/* Queue Items */}
      <View style={styles.itemsList}>
        {activeItems.length === 0 ? (
          <Card style={styles.emptyCard}>
            <MaterialIcons name="inbox" size={36} color={colors.secondary} />
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
                    <MaterialIcons name="photo-library" size={20} color={colors.secondary} />
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
                    <MaterialIcons name="info-outline" size={12} color={colors.secondary} />
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
          <MaterialIcons name="inventory-2" size={20} color={colors.secondary} />
          <Text style={[typography.labelSm, styles.purgeTitle]}>
            BẢO TOÀN DỮ LIỆU TRÊN THIẾT BỊ
          </Text>
        </View>

        <Text style={[typography.bodyMd, styles.purgeDesc]}>
          Màn hình chỉ đọc hàng đợi của phiên hiện tại. Trạng thái cục bộ không chứng minh máy chủ đã nhận hồ sơ. Bản nháp, tệp và lịch sử được giữ nguyên.
        </Text>

        <Pressable
          style={[styles.purgeBtn, purgedCount > 0 && styles.purgeBtnDisabled]}
          onPress={handleSafePurge}
          disabled={purgedCount > 0}
          accessibilityRole="button"
        >
          <MaterialIcons name="info-outline" size={16} color={purgedCount > 0 ? colors.secondary : colors.error} />
          <Text style={[typography.labelSm, { color: purgedCount > 0 ? colors.secondary : colors.error }]}>
            {purgedCount > 0
              ? `Đã giải phóng an toàn ${purgedCount} bản sao`
              : 'Vì sao dữ liệu vẫn được giữ?'}
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
    backgroundColor: colors.primary,
  },
  toggleBtnText: {
    fontSize: 11,
    color: colors.secondary,
  },
  toggleBtnTextActive: {
    color: colors.onPrimary,
    fontWeight: 'bold',
  },
  summaryCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.xl,
    ...softShadow,
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
    borderRadius: radius.xl,
    ...softShadow,
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
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  uploadingText: {
    color: colors.secondary,
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
