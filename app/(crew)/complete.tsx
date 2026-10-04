import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Toast } from '../../src/components/Toast';
import { Chip } from '../../src/components/Chip';
import { defectTypeLabel } from '../../src/constants/defect-types';
import { BUSINESS_ERROR_MESSAGES } from '../../src/constants/error-codes';
import { openDatabase, initDatabase, upsertOffline } from '../../src/offline/database';
import { enqueue } from '../../src/offline/upload-queue';
import { stableUuid } from '../../src/utils/uuid';
import {
  EVIDENCE_REUSE_SOURCE_TAGS,
  getCrewFieldSession,
  markSessionSubmitted,
  type CrewFieldSession,
} from '../../src/api/mock/crew-inspection';
import { getCrewTaskById, TASK_MODE_CHIP } from './tasks';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

function formatMeasurement(value: number | null, unit: string): string {
  return value === null ? 'Chưa đo' : `${value.toFixed(2)} ${unit}`;
}

function getTaskSession(taskId: string): CrewFieldSession | null {
  const session = getCrewFieldSession();
  return session && session.task_id === taskId ? session : null;
}

export default function CrewCompleteScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const task = getCrewTaskById(params.id);
  const modeChip = TASK_MODE_CHIP[task.task_mode];

  const [session, setSession] = useState(() => getTaskSession(task.id));
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setSession(getTaskSession(task.id));
    }, [task.id]),
  );

  const beforeUri = session?.before_local_uri ?? null;
  const afterUri = session?.after_local_uri ?? null;
  const measure = session?.measurement ?? { length_m: null, width_m: null, depth_cm: null };
  const hasAllDimensions = measure.length_m !== null && measure.width_m !== null && measure.depth_cm !== null;
  const requiresAfterPhoto = task.task_mode !== 'MEASURE_ONLY';
  const statusLabel = task.completedAt
    ? 'Đã hoàn thành'
    : task.task_mode === 'MEASURE_ONLY'
      ? 'Đã đo & gửi PM'
      : 'Đã xử lý tại hiện trường';

  const checklist = useMemo(
    () => {
      const items = [
        {
          label: 'Cập nhật trạng thái',
          detail: `Chuyển sang "${statusLabel}"`,
          done: true,
        },
        {
          label: 'Ảnh hiện trạng trước sửa',
          detail: session?.before_source
            ? `${EVIDENCE_REUSE_SOURCE_TAGS[session.before_source]} • có đóng dấu GPS`
            : BUSINESS_ERROR_MESSAGES.BEFORE_MISSING,
          done: Boolean(beforeUri) || Boolean(session?.before_evidence_id),
        },
        {
          label: 'Kích thước hình học hư hại',
          detail: hasAllDimensions
            ? `Dài ${measure.length_m?.toFixed(2)}m • Rộng ${measure.width_m?.toFixed(2)}m • Sâu ${measure.depth_cm?.toFixed(1)}cm • Diện tích ${session?.area_m2?.toFixed(2) ?? '0.00'} m²`
            : 'Cần đủ 3 kích thước thực tế: chiều dài, chiều rộng, độ sâu.',
          done: hasAllDimensions,
        },
      ];
      if (requiresAfterPhoto) {
        items.push({
          label: 'Ảnh nghiệm thu sau sửa',
          detail: afterUri
            ? 'Đã chụp tại hiện trường, có đóng dấu GPS'
            : 'Chưa có ảnh nghiệm thu sau sửa',
          done: Boolean(afterUri),
        });
      }
      return items;
    },
    [
      statusLabel,
      session?.before_source,
      session?.before_evidence_id,
      session?.area_m2,
      beforeUri,
      afterUri,
      hasAllDimensions,
      measure.length_m,
      measure.width_m,
      measure.depth_cm,
      requiresAfterPhoto,
    ],
  );

  const doneCount = checklist.filter((item) => item.done).length;
  const allDone = doneCount === checklist.length;
  const pct = Math.round((doneCount / checklist.length) * 100);

  const handleSubmit = async () => {
    if (submitting || !allDone) {
      return;
    }
    setSubmitting(true);
    const submitted = markSessionSubmitted();
    const attemptId = session?.attempt_id ?? stableUuid(`attempt:${task.id}`);
    // `kind` phải là kind canonical của SyncOperation (SyncAttemptSubmit) — outbox lưu
    // đúng giá trị này để màn sync dựng được SyncBatch hợp lệ.
    const payload = {
      kind: 'REPAIR_SUBMIT',
      attempt_id: attemptId,
      task_id: task.id,
      work_order_code: task.wo_code,
      task_mode: task.task_mode,
      defect_type_code: task.defect_type_code,
      route_code: task.route_code,
      chainage: task.chainage,
      coordinates: session?.coordinates ?? task.coordinates,
      measurement: session?.measurement ?? null,
      area_m2: session?.area_m2 ?? null,
      fast_track_evaluation: session?.evaluation_code ?? null,
      before: {
        evidence_id: session?.before_evidence_id ?? null,
        source: session?.before_source ?? null,
        local_uri: beforeUri,
        watermark: session?.before_watermark ?? null,
      },
      after: {
        local_uri: afterUri,
        watermark: session?.after_watermark ?? null,
      },
      submitted_at: submitted?.submitted_at ?? new Date().toISOString(),
    };

    try {
      const db = openDatabase();
      await initDatabase(db);
      const now = new Date().toISOString();
      await enqueue(db, 'REPAIR_SUBMIT', JSON.stringify(payload), {
        taskId: task.id,
        idempotencyKey: stableUuid(`REPAIR_SUBMIT:${attemptId}`),
      });
      await upsertOffline(db, 'local_draft', `repair-attempt-${Date.now()}`, {
        kind: 'REPAIR_SUBMIT',
        payload: JSON.stringify(payload),
        created_at: now,
        updated_at: now,
      });
    } catch {
      setToast('Không ghi được hàng đợi offline — vui lòng thử lại khi có mạng.');
      setSubmitting(false);
      return;
    }

    setToast('Đã nộp hồ sơ cho PM. Hồ sơ đang chờ đồng bộ.');
    setTimeout(() => router.push({ pathname: '/(crew)/sync', params: { id: task.id } }), 1500);
  };

  return (
    <SafeAreaScreen
      scroll
      header={
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.neutral} />
            </Pressable>
            <Text style={[typography.titleMd, styles.topBarTitle]}>
              Hoàn tất công việc • Lệnh số {task.wo_code.replace('#WO-', '')}
            </Text>
          </View>
          <Chip variant={modeChip.variant} label={modeChip.label} uppercase={false} />
        </View>
      }
    >
      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={[typography.labelSm, styles.summaryLabel]}>LỆNH THI CÔNG</Text>
            <Text style={[typography.titleLg, styles.summaryCode]}>
              Lệnh số {task.wo_code.replace('#WO-', '')}
            </Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={[typography.labelSm, styles.statusPillText]}>{statusLabel}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={[typography.bodyMd, styles.infoLabel]}>Hạng mục:</Text>
          <Text style={[typography.bodyMd, styles.infoValue]}>
            {defectTypeLabel(task.defect_type_code)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[typography.bodyMd, styles.infoLabel]}>Tuyến / Lý trình:</Text>
          <Text style={[typography.bodyMd, styles.infoValue]}>
            {task.route_code} • {task.chainage} • {task.section_name}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[typography.bodyMd, styles.infoLabel]}>Vị trí khuyết tật:</Text>
          <Text style={[typography.bodyMd, styles.infoValue]}>{task.defect_location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[typography.bodyMd, styles.infoLabel]}>Tọa độ WGS84:</Text>
          <Text style={[typography.bodyMd, styles.infoValue]}>
            {task.coordinates.latitude.toFixed(6)}° B, {task.coordinates.longitude.toFixed(6)}° Đ
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[typography.bodyMd, styles.infoLabel]}>Mã lệnh sửa chữa:</Text>
          <Text style={[typography.bodyMd, styles.infoValue]}>{session?.attempt_id ?? 'Không áp dụng'}</Text>
        </View>
      </Card>

      <Card style={styles.checklistCard}>
        <View style={styles.checklistHeader}>
          <Text style={[typography.labelSm, styles.checklistTitle]}>
            HẠNG MỤC NGHIỆM THU BÀN GIAO ({doneCount}/{checklist.length})
          </Text>
          <View style={styles.pctBadge}>
            <Text style={[typography.labelSm, styles.pctText]}>{pct}%</Text>
          </View>
        </View>
        <View style={styles.checklistDivider} />
        {checklist.map((item) => (
          <View key={item.label} style={styles.checkItem}>
            <View style={[styles.checkIcon, !item.done && styles.checkIconPending]}>
              <MaterialIcons
                name={item.done ? 'check' : 'warning'}
                size={16}
                color={item.done ? colors.success : colors.warning}
              />
            </View>
            <View style={styles.checkContent}>
              <Text style={[typography.labelSm, styles.checkLabel]}>{item.label}</Text>
              <Text style={[typography.caption, styles.checkDetail]}>{item.detail}</Text>
            </View>
            <Text style={[typography.labelSm, item.done ? styles.checkStatus : styles.checkStatusPending]}>
              {item.done ? 'Hoàn thành' : 'Còn thiếu'}
            </Text>
          </View>
        ))}
      </Card>

      <View style={styles.imagePair}>
        <View style={styles.imageCol}>
          <Text style={[typography.labelSm, styles.imageLabel]}>ẢNH HIỆN TRẠNG TRƯỚC SỬA</Text>
          {beforeUri ? (
            <Image source={{ uri: beforeUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialIcons name="image" size={28} color={colors.secondary} />
              <Text style={[typography.caption, styles.imagePlaceholderText]}>
                {session?.before_source ? EVIDENCE_REUSE_SOURCE_TAGS[session.before_source] : BUSINESS_ERROR_MESSAGES.BEFORE_MISSING}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.imageCol}>
          <Text style={[typography.labelSm, styles.imageLabel]}>ẢNH NGHIỆM THU SAU SỬA</Text>
          {afterUri ? (
            <Image source={{ uri: afterUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialIcons name="image" size={28} color={colors.secondary} />
              <Text style={[typography.caption, styles.imagePlaceholderText]}>Chưa chụp ảnh nghiệm thu</Text>
            </View>
          )}
        </View>
      </View>

      <Card style={styles.statsCard}>
        <Text style={[typography.labelSm, styles.statsTitle]}>KÍCH THƯỚC HÌNH HỌC HƯ HẠI THỰC TẾ</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={[typography.titleLg, styles.statValue]}>
              {formatMeasurement(session?.area_m2 ?? null, 'm²')}
            </Text>
            <Text style={[typography.caption, styles.statLabel]}>Diện tích hư hại</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[typography.titleLg, styles.statValue]}>
              {formatMeasurement(session?.measurement.length_m ?? null, 'm')}
            </Text>
            <Text style={[typography.caption, styles.statLabel]}>Chiều dài</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[typography.titleLg, styles.statValueGold]}>
              {formatMeasurement(session?.measurement.depth_cm ?? null, 'cm')}
            </Text>
            <Text style={[typography.caption, styles.statLabel]}>Độ sâu</Text>
          </View>
        </View>
        {task.task_mode === 'MEASURE_ONLY' ? (
          <View style={styles.noticeWarn}>
            <MaterialIcons name="lock" size={15} color={colors.warning} />
            <Text style={[typography.caption, styles.noticeWarnText]}>
              {BUSINESS_ERROR_MESSAGES.TASK_MODE_NOT_REPAIRABLE}
            </Text>
          </View>
        ) : null}
      </Card>

      <Card style={styles.readyCard}>
        <View style={styles.readyRow}>
          <View style={[styles.readyIcon, !allDone && styles.readyIconPending]}>
            <MaterialIcons
              name={allDone ? 'check-circle' : 'warning'}
              size={20}
              color={allDone ? colors.success : colors.warning}
            />
          </View>
          <View style={styles.readyTextWrap}>
            <Text style={[typography.labelSm, allDone ? styles.readyText : styles.readyTextPending]}>
              {allDone
                ? 'Sẵn sàng gửi cho PM xác nhận'
                : 'Còn hạng mục chưa đủ — hoàn thiện hồ sơ trước khi gửi cho PM.'}
            </Text>
            <Text style={[typography.caption, styles.br25Text]}>
              Nghiệm thu trực tiếp: Chỉ huy trưởng (PM) đánh giá và đóng hồ sơ tại chỗ theo quy trình sửa nhanh.
            </Text>
          </View>
        </View>
      </Card>

      <Text style={[typography.caption, styles.notice]}>
        * Sau khi gửi, hồ sơ công việc sẽ được khóa chỉnh sửa tại hiện trường và chuyển sang hàng đợi của Quản lý Dự án (PM).
      </Text>

      <View style={styles.ctaWrap}>
        <Button
          variant="primary"
          title="Gửi cho PM"
          disabled={!allDone}
          loading={submitting}
          onPress={handleSubmit}
        />
        {!allDone ? (
          <View style={styles.blockedBox}>
            <MaterialIcons name="info-outline" size={14} color={colors.error} />
            <Text style={[typography.caption, styles.blockedText]}>
              Còn thiếu: {checklist.filter((item) => !item.done).map((item) => item.label).join('; ')}
            </Text>
          </View>
        ) : null}
      </View>

      {toast ? <Toast type="success" message={toast} /> : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  topBarTitle: {
    color: colors.neutral,
    flexShrink: 1,
  },
  summaryCard: {
    marginBottom: spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  summaryLabel: {
    color: colors.secondary,
  },
  summaryCode: {
    color: colors.neutral,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: '#EBFBEE',
    borderWidth: 1,
    borderColor: '#B2F2BB',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  statusPillText: {
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    color: colors.secondary,
  },
  infoValue: {
    color: colors.neutral,
    fontFamily: 'Roboto-Medium',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
  checklistCard: {
    marginBottom: spacing.md,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checklistTitle: {
    color: colors.neutral,
  },
  pctBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: '#EBFBEE',
  },
  pctText: {
    color: colors.success,
  },
  checklistDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: '#EBFBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  checkContent: {
    flex: 1,
  },
  checkLabel: {
    color: colors.neutral,
  },
  checkDetail: {
    color: colors.secondary,
    marginTop: 2,
  },
  checkStatus: {
    color: colors.success,
  },
  checkStatusPending: {
    color: colors.warning,
  },
  imagePair: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  imageCol: {
    flex: 1,
  },
  imageLabel: {
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  image: {
    height: 100,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
  imagePlaceholder: {
    height: 100,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  imagePlaceholderText: {
    color: colors.secondary,
    textAlign: 'center',
  },
  statsCard: {
    marginBottom: spacing.md,
  },
  statsTitle: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.neutral,
  },
  statValueGold: {
    color: colors.primary,
  },
  statLabel: {
    color: colors.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  noticeWarn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  noticeWarnText: {
    flex: 1,
    color: colors.brandGold,
  },
  readyCard: {
    marginBottom: spacing.md,
    backgroundColor: '#EBFBEE',
    borderWidth: 1,
    borderColor: '#B2F2BB',
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  readyIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyIconPending: {
    backgroundColor: colors.warning,
  },
  readyTextWrap: {
    flex: 1,
    gap: 4,
  },
  readyText: {
    color: colors.success,
  },
  readyTextPending: {
    color: colors.warning,
  },
  br25Text: {
    color: colors.secondary,
  },
  notice: {
    color: colors.secondary,
    fontStyle: 'italic',
    marginBottom: spacing.lg,
  },
  ctaWrap: {
    paddingBottom: spacing.xl,
  },
  blockedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  blockedText: {
    flex: 1,
    color: colors.error,
  },
});
