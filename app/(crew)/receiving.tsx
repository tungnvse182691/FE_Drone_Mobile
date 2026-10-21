import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip, type ChipVariant } from '../../src/components/Chip';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { Toast } from '../../src/components/Toast';
import {
  ackReceivingRequest,
  getReceivingRequest,
  isRepairVersionConflict,
  listReceivingRequests,
  repairCommandErrorMessage,
  useIdempotencyKey,
} from '../../src/hooks/useRepairBootstrap';
import type { BusinessDutyView } from '../../src/api/mock/tasks';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

/** Nhãn tiếng Việt cho `kind` của BusinessDutyView; kind lạ → nhãn chung. */
const KIND_LABELS: Record<string, string> = {
  REPAIR_REVIEW_REQUEST: 'Yêu cầu PM duyệt lượt sửa',
  FIELD_VERIFICATION: 'Xác minh kết quả đo hiện trường',
  HANDOVER_RECEIPT: 'Biên nhận bàn giao',
};

function kindLabel(kind: string | null): string {
  if (!kind) {
    return 'Yêu cầu nhận việc';
  }
  return KIND_LABELS[kind] ?? 'Yêu cầu nhận việc';
}

function formatWaiting(seconds: number): string {
  if (seconds <= 0) {
    return '—';
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}p` : `${minutes}p`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function ackStateChip(request: BusinessDutyView): { variant: ChipVariant; label: string } {
  return request.acknowledgmentId
    ? { variant: 'approved', label: 'Đã nhận việc' }
    : { variant: 'status-pending', label: 'Chờ nhận việc' };
}

export default function CrewReceivingScreen() {
  const [step, setStep] = useState<'list' | 'detail'>('list');
  const [items, setItems] = useState<BusinessDutyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BusinessDutyView | null>(null);
  const [acking, setAcking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const nextIdempotencyKey = useIdempotencyKey('API-137');

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const result = await listReceivingRequests({ limit: 25 });
      setItems(result.items);
    } catch (error) {
      setListError(repairCommandErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setStep('list');
      setSelected(null);
      void loadList();
    }, [loadList]),
  );

  const openDetail = async (requestId: string) => {
    setLoading(true);
    try {
      const detail = await getReceivingRequest(requestId);
      setSelected(detail);
      setStep('detail');
    } catch (error) {
      setToast(repairCommandErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  /** ACK là bất biến: ACK đầu tiên chốt người nhận, không thay đổi lại được. */
  const handleAck = async () => {
    if (!selected || selected.acknowledgmentId || acking) {
      return;
    }
    setAcking(true);
    try {
      const acknowledged = await ackReceivingRequest(
        selected.id,
        selected.version ?? '',
        { claimedDeviceAt: new Date().toISOString() },
        nextIdempotencyKey(),
      );
      setSelected(acknowledged);
      setItems((prev) => prev.map((item) => (item.id === acknowledged.id ? acknowledged : item)));
      setToast('Đã nhận việc. Người nhận đầu tiên được chốt và không thể thay đổi.');
    } catch (error) {
      if (isRepairVersionConflict(error)) {
        try {
          const fresh = await getReceivingRequest(selected.id);
          setSelected(fresh);
          setItems((prev) => prev.map((item) => (item.id === fresh.id ? fresh : item)));
        } catch {
          /* giữ dữ liệu cũ, vẫn báo cho người dùng */
        }
        Alert.alert(
          'Yêu cầu đã thay đổi',
          'Yêu cầu nhận việc đã được cập nhật trên máy chủ. Vui lòng kiểm tra lại thông tin mới rồi xác nhận.',
          [{ text: 'Đã hiểu' }],
        );
      } else {
        setToast(repairCommandErrorMessage(error));
      }
    } finally {
      setAcking(false);
    }
  };

  const renderList = () => {
    if (loading && items.length === 0) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[typography.caption, styles.loadingText]}>Đang tải yêu cầu nhận việc…</Text>
        </View>
      );
    }
    if (listError) {
      return (
        <EmptyState
          icon="error-outline"
          title="Không tải được yêu cầu nhận việc"
          message={listError}
          actionLabel="Tải lại"
          onAction={() => void loadList()}
        />
      );
    }
    if (items.length === 0) {
      return (
        <EmptyState
          icon="inbox"
          title="Chưa có yêu cầu nhận việc"
          message="Khi PM hoặc Giám sát gửi việc cho bạn, yêu cầu sẽ xuất hiện tại đây để xác nhận."
        />
      );
    }
    return (
      <View style={styles.list}>
        {items.map((request) => {
          const state = ackStateChip(request);
          return (
            <Pressable
              key={request.id}
              onPress={() => void openDetail(request.id)}
              accessibilityRole="button"
              accessibilityLabel={`${kindLabel(request.kind)} — ${state.label}`}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Card style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowTitleWrap}>
                    <MaterialIcons name="inbox" size={16} color={colors.brandGold} />
                    <Text style={[typography.labelLg, styles.rowTitle]}>{kindLabel(request.kind)}</Text>
                  </View>
                  <Chip variant={state.variant} label={state.label} uppercase={false} />
                </View>
                <View style={styles.metaRow}>
                  <MaterialIcons name="schedule" size={13} color={colors.secondary} />
                  <Text style={[typography.caption, styles.metaText]}>
                    Gửi lúc {formatDateTime(request.requestedAt)} • Chờ {formatWaiting(request.waitingSeconds)}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialIcons name="person" size={13} color={colors.secondary} />
                  <Text style={[typography.caption, styles.metaText]}>
                    Người nhận: {request.responsibleRole ?? 'REPAIR_CREW'}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderDetail = () => {
    if (!selected) {
      return null;
    }
    const state = ackStateChip(selected);
    const acknowledged = Boolean(selected.acknowledgmentId);
    return (
      <View>
        <Card style={styles.detailCard}>
          <View style={styles.rowHeader}>
            <Text style={[typography.titleMd, styles.detailTitle]}>{kindLabel(selected.kind)}</Text>
            <Chip variant={state.variant} label={state.label} uppercase={false} />
          </View>

          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Nguồn yêu cầu</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>{selected.sourceKind ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Vai trò nhận việc</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              {selected.responsibleRole ?? 'REPAIR_CREW'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Gửi lúc</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              {formatDateTime(selected.requestedAt)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Thời gian chờ</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              {formatWaiting(selected.waitingSeconds)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Phiên bản yêu cầu</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>{selected.version ?? '—'}</Text>
          </View>
          {acknowledged ? (
            <>
              <View style={styles.infoRow}>
                <Text style={[typography.caption, styles.infoLabel]}>Đã nhận việc lúc</Text>
                <Text style={[typography.bodyMd, styles.infoValue]}>
                  {formatDateTime(selected.acknowledgedAt)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[typography.caption, styles.infoLabel]}>Mã xác nhận</Text>
                <Text style={[typography.bodyMd, styles.infoValue]}>
                  {selected.acknowledgmentId}
                </Text>
              </View>
            </>
          ) : null}
        </Card>

        <View style={styles.notice}>
          <MaterialIcons name="info-outline" size={16} color={colors.brandGold} />
          <Text style={[typography.caption, styles.noticeText]}>
            Xác nhận nhận việc là thao tác bất biến: người nhận đầu tiên được chốt cho yêu cầu này.
          </Text>
        </View>

        <Button
          variant="primary"
          title={acknowledged ? 'Đã nhận việc' : 'Xác nhận nhận việc'}
          loading={acking}
          disabled={acknowledged || acking}
          onPress={() => void handleAck()}
          style={styles.ackButton}
        />
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <SafeAreaScreen
        scroll
        header={
          step === 'detail' ? (
            <View style={styles.topBar}>
              <Pressable
                onPress={() => {
                  setStep('list');
                  setSelected(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Quay lại danh sách"
                hitSlop={8}
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              >
                <MaterialIcons name="arrow-back" size={20} color={colors.neutral} />
              </Pressable>
              <Text style={[typography.titleMd, styles.topBarTitle]}>Nhận việc</Text>
            </View>
          ) : (
            <AppHeader subtitle="Nhận việc (ACK)" />
          )
        }
      >
        {step === 'list' ? renderList() : renderDetail()}
      </SafeAreaScreen>
      {toast ? <Toast type="success" message={toast} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.secondary,
  },
  list: {
    paddingBottom: 120,
  },
  rowCard: {
    marginBottom: spacing.md,
    borderRadius: radius.xl,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  rowTitle: {
    color: colors.neutral,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaText: {
    color: colors.secondary,
    flexShrink: 1,
  },
  detailCard: {
    borderRadius: radius.xl,
  },
  detailTitle: {
    color: colors.neutral,
    flexShrink: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: {
    color: colors.secondary,
    flexShrink: 0,
  },
  infoValue: {
    color: colors.neutral,
    flexShrink: 1,
    textAlign: 'right',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  noticeText: {
    color: colors.secondary,
    flex: 1,
  },
  ackButton: {
    marginTop: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topBarTitle: {
    color: colors.neutral,
  },
  backButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
});
