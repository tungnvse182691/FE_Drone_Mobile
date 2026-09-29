import React, { useCallback, useMemo, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { InputField } from '../../src/components/InputField';
import { defectTypeLabel } from '../../src/constants/defect-types';
import { BUSINESS_ERROR_MESSAGES } from '../../src/constants/error-codes';
import {
  FAST_TRACK_POLICY,
  evaluateFastTrack,
  getBeforeEvidenceCandidates,
  getCrewFieldSession,
  selectBeforeEvidence,
  startCrewFieldSession,
  updateCrewMeasurement,
  markAttemptStarted,
  markSessionSubmitted,
  EVIDENCE_REUSE_SOURCE_TAGS,
  type BeforeEvidenceCandidate,
} from '../../src/api/mock/crew-inspection';
import { getCrewTaskById, TASK_MODE_CHIP } from './tasks';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

function parseDimension(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function formatCapturedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export default function CrewWoDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const task = getCrewTaskById(params.id);
  const modeChip = TASK_MODE_CHIP[task.task_mode];

  const [session, setSession] = useState(() => getCrewFieldSession());
  const initialMeasurement = session?.measurement ?? { length_m: null, width_m: null, depth_cm: null };
  const [lengthText, setLengthText] = useState(() => (initialMeasurement.length_m !== null ? String(initialMeasurement.length_m) : ''));
  const [widthText, setWidthText] = useState(() => (initialMeasurement.width_m !== null ? String(initialMeasurement.width_m) : ''));
  const [depthText, setDepthText] = useState(() => (initialMeasurement.depth_cm !== null ? String(initialMeasurement.depth_cm) : ''));

  useFocusEffect(
    useCallback(() => {
      const existing = getCrewFieldSession();
      if (existing && existing.task_id === task.id) {
        setSession(existing);
        if (existing.measurement.length_m !== null) setLengthText(String(existing.measurement.length_m));
        if (existing.measurement.width_m !== null) setWidthText(String(existing.measurement.width_m));
        if (existing.measurement.depth_cm !== null) setDepthText(String(existing.measurement.depth_cm));
      } else {
        const fresh = startCrewFieldSession({
          task_id: task.id,
          work_order_code: task.wo_code,
          task_mode: task.task_mode,
          defect_type_code: task.defect_type_code,
          coordinates: task.coordinates,
        });
        setSession(fresh);
        setLengthText('');
        setWidthText('');
        setDepthText('');
      }
    }, [task.id, task.wo_code, task.task_mode, task.defect_type_code, task.coordinates]),
  );

  const candidates = useMemo(
    () => getBeforeEvidenceCandidates(task.defect_type_code),
    [task.defect_type_code, session?.before_evidence_id],
  );

  const measurement = session?.measurement ?? { length_m: null, width_m: null, depth_cm: null };
  const evaluation = useMemo(
    () => evaluateFastTrack(task.task_mode, measurement, task.defect_type_code),
    [task.task_mode, task.defect_type_code, measurement.length_m, measurement.width_m, measurement.depth_cm],
  );

  const handleMeasurement = useCallback(
    (patch: { length_m?: number | null; width_m?: number | null; depth_cm?: number | null }) => {
      updateCrewMeasurement(patch);
      setSession(getCrewFieldSession());
    },
    [],
  );

  const handleUseBefore = useCallback((candidate: BeforeEvidenceCandidate) => {
    selectBeforeEvidence(candidate);
    setSession(getCrewFieldSession());
  }, []);

  const handleCaptureBefore = () => {
    router.push({ pathname: '/(crew)/viewfinder', params: { id: task.id, mode: 'BEFORE' } });
  };

  const openGoogleMaps = () => {
    const { latitude, longitude } = task.coordinates;
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    );
  };

  const beforeSelected = Boolean(session?.before_evidence_id);
  const measureReady = evaluation.hasAllDimensions;

  const handlePrimaryAction = () => {
    if (!evaluation.hasAllDimensions) {
      return;
    }
    if (task.task_mode === 'MEASURE_ONLY') {
      if (!beforeSelected) {
        return;
      }
      markSessionSubmitted();
      router.push({ pathname: '/(crew)/complete', params: { id: task.id } });
      return;
    }
    if (evaluation.code === 'ELIGIBLE') {
      if (!beforeSelected) {
        return;
      }
      markAttemptStarted();
      router.push({ pathname: '/(crew)/progress', params: { id: task.id } });
      return;
    }
    markSessionSubmitted();
    router.push({ pathname: '/(crew)/complete', params: { id: task.id } });
  };

  const primaryLabel =
    task.task_mode === 'MEASURE_ONLY'
      ? 'Gửi kết quả đo cho PM'
      : evaluation.code === 'ELIGIBLE'
        ? 'Tiến hành sửa nhanh tại chỗ'
        : 'Gửi kết quả đo cho PM';

  const primaryDisabled = !measureReady;
  const primaryBlockedReason = !beforeSelected ? BUSINESS_ERROR_MESSAGES.BEFORE_MISSING : null;

  return (
    <SafeAreaScreen
      scroll
      header={
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.neutral} />
            </Pressable>
            <Text style={[typography.titleMd, styles.topBarTitle]}>Chi tiết lệnh công tác</Text>
          </View>
          <Chip variant={modeChip.variant} label={modeChip.label} uppercase={false} />
        </View>
      }
    >
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="build" size={16} color={colors.brandGold} />
            <Text style={[typography.titleMd, styles.cardTitleText]}>Thông tin kỹ thuật</Text>
          </View>
          <Text style={[typography.labelSm, styles.taskCode]}>
            Lệnh số {task.wo_code.replace('#WO-', '')}
          </Text>
        </View>

        <Text style={[typography.titleMd, styles.defectTitle]}>
          {defectTypeLabel(task.defect_type_code)} — {task.chainage} Tuyến {task.route_code}
        </Text>
        <Text style={[typography.caption, styles.defectLocation]}>{task.locality}</Text>

        <View style={styles.infoList}>
          <View style={styles.infoRow}>
            <MaterialIcons name="info-outline" size={15} color={colors.brandGold} />
            <Text style={[typography.bodyMd, styles.infoText]}>
              Loại lỗi: <Text style={styles.strong}>{defectTypeLabel(task.defect_type_code)}</Text>
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="alt-route" size={15} color={colors.brandGold} />
            <Text style={[typography.bodyMd, styles.infoText]}>
              Tuyến đường: <Text style={styles.strong}>{task.route_code}</Text> • Phân đoạn{' '}
              <Text style={styles.strong}>{task.section_name}</Text> • Lý trình {task.chainage}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={15} color={colors.brandGold} />
            <Text style={[typography.bodyMd, styles.infoText]}>
              Vị trí khuyết tật: <Text style={styles.strong}>{task.defect_location}</Text>
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="navigation" size={15} color={colors.brandGold} />
            <Text style={[typography.bodyMd, styles.infoText]}>
              Tọa độ WGS84:{' '}
              <Text style={styles.strong}>
                {task.coordinates.latitude.toFixed(6)}° B, {task.coordinates.longitude.toFixed(6)}° Đ
              </Text>
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons
              name={task.due_urgency === 'urgent' ? 'alarm' : 'access-time'}
              size={15}
              color={task.due_urgency === 'urgent' ? colors.error : colors.brandGold}
            />
            <Text style={[typography.bodyMd, styles.infoText]}>
              Thời hạn hoàn thành:{' '}
              <Text
                style={[
                  styles.strong,
                  task.due_urgency === 'urgent' ? styles.dueUrgent : null,
                ]}
              >
                {task.due_label}
              </Text>
            </Text>
          </View>
        </View>

        <Text style={[typography.bodyMd, styles.descriptionText]}>{task.description}</Text>

        <Button
          variant="secondary"
          title="Dẫn đường Google Maps"
          icon={<MaterialIcons name="directions" size={18} color={colors.neutral} />}
          onPress={openGoogleMaps}
          style={styles.mapsButton}
        />
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="photo-camera" size={16} color={colors.brandGold} />
            <Text style={[typography.titleMd, styles.cardTitleText]}>Ảnh hiện trạng</Text>
          </View>
          <Text style={[typography.labelSm, styles.taskCode]}>Ảnh đối chứng</Text>
        </View>

        {beforeSelected && session?.before_source ? (
          <View style={styles.selectedBefore}>
            <MaterialIcons name="check-circle" size={18} color={colors.success} />
            <Text style={[typography.bodyMd, styles.selectedBeforeText]}>
              Đã chọn: {EVIDENCE_REUSE_SOURCE_TAGS[session.before_source]}
            </Text>
          </View>
        ) : null}

        {candidates.length === 0 ? (
          <View style={styles.noCandidate}>
            <MaterialIcons name="info-outline" size={16} color={colors.secondary} />
            <Text style={[typography.caption, styles.noCandidateText]}>
              Chưa có ảnh nào từ Phản ánh hoặc Drone khớp vị trí này. Hãy chụp ảnh hiện trạng mới tại hiện trường.
            </Text>
          </View>
        ) : (
          candidates.map((candidate) => {
            const isSelected = session?.before_evidence_id === candidate.id;
            return (
              <View key={candidate.id} style={styles.candidateRow}>
                {candidate.local_uri ? (
                  <Image
                    source={{ uri: candidate.local_uri }}
                    style={styles.candidateThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.candidateThumb, styles.candidateThumbEmpty]}>
                    <MaterialIcons name="image" size={20} color={colors.secondary} />
                  </View>
                )}
                <View style={styles.candidateInfo}>
                  <Text style={[typography.labelSm, styles.candidateSourceTag]}>
                    [{EVIDENCE_REUSE_SOURCE_TAGS[candidate.source]}]
                  </Text>
                  <Text style={[typography.caption, styles.candidateMeta]}>{candidate.source_label}</Text>
                  <Text style={[typography.caption, styles.candidateMeta]}>
                    Chụp {formatCapturedAt(candidate.captured_at)} • {candidate.coordinates.latitude.toFixed(5)}° B,{' '}
                    {candidate.coordinates.longitude.toFixed(5)}° Đ
                  </Text>
                </View>
                <Button
                  variant={isSelected ? 'primary' : 'secondary'}
                  title={isSelected ? 'Đang sử dụng' : 'Dùng ảnh này'}
                  onPress={() => handleUseBefore(candidate)}
                />
              </View>
            );
          })
        )}

        <Button
          variant="secondary"
          title="Chụp ảnh hiện trạng mới tại hiện trường"
          icon={<MaterialIcons name="photo-camera" size={18} color={colors.neutral} />}
          onPress={handleCaptureBefore}
          style={styles.captureButton}
        />
        <Text style={[typography.caption, styles.hintText]}>
          Dùng lại ảnh khi hiện trường không thay đổi so với ảnh Phản ánh hoặc Drone; chụp mới khi hiện trường đã thay đổi.
        </Text>
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="aspect-ratio" size={16} color={colors.brandGold} />
            <Text style={[typography.titleMd, styles.cardTitleText]}>
              Kích thước hư hại
            </Text>
          </View>
          <Text style={[typography.labelSm, styles.taskCode]}>TCVN 10380</Text>
        </View>

        <View style={styles.measureGrid}>
          <View style={styles.measureCol}>
            <InputField
              label="Chiều dài"
              value={lengthText}
              onChangeText={(value) => {
                setLengthText(value);
                handleMeasurement({ length_m: parseDimension(value) });
              }}
              placeholder="0.0"
              keyboardType="decimal-pad"
              unit="m"
            />
          </View>
          <View style={styles.measureCol}>
            <InputField
              label="Chiều rộng"
              value={widthText}
              onChangeText={(value) => {
                setWidthText(value);
                handleMeasurement({ width_m: parseDimension(value) });
              }}
              placeholder="0.0"
              keyboardType="decimal-pad"
              unit="m"
            />
          </View>
          <View style={styles.measureCol}>
            <InputField
              label="Độ sâu"
              value={depthText}
              onChangeText={(value) => {
                setDepthText(value);
                handleMeasurement({ depth_cm: parseDimension(value) });
              }}
              placeholder="0.0"
              keyboardType="decimal-pad"
              unit="cm"
            />
          </View>
        </View>

        <View style={styles.quickPresetRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLengthText('1.2');
              setWidthText('0.6');
              setDepthText('3.0');
              handleMeasurement({ length_m: 1.2, width_m: 0.6, depth_cm: 3.0 });
            }}
            style={({ pressed }) => [styles.presetChip, pressed && styles.pressed]}
          >
            <MaterialIcons name="flash-on" size={13} color={colors.primary} />
            <Text style={[typography.caption, styles.presetText]}>Điền mẫu Đạt: 1.2m × 0.6m × 3cm</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLengthText('2.5');
              setWidthText('1.2');
              setDepthText('8.0');
              handleMeasurement({ length_m: 2.5, width_m: 1.2, depth_cm: 8.0 });
            }}
            style={({ pressed }) => [styles.presetChip, pressed && styles.pressed]}
          >
            <MaterialIcons name="warning" size={13} color={colors.secondary} />
            <Text style={[typography.caption, styles.presetText]}>Điền mẫu Vượt: 2.5m × 1.2m × 8cm</Text>
          </Pressable>
        </View>

        <View style={styles.areaBox}>
          <Text style={[typography.caption, styles.areaLabel]}>Diện tích tự động tính (L × W)</Text>
          <Text style={[typography.titleLg, styles.areaValue]}>
            {evaluation.area_m2 === null ? '—' : `${evaluation.area_m2.toFixed(2)} m²`}
          </Text>
        </View>

        <Text style={[typography.caption, styles.policyText]}>
          Ngưỡng quy chuẩn: diện tích ≤ {FAST_TRACK_POLICY.max_area_m2.toFixed(1)} m² • độ sâu ≤{' '}
          {FAST_TRACK_POLICY.max_depth_cm.toFixed(1)} cm • chiều dài ≤{' '}
          {FAST_TRACK_POLICY.max_length_m.toFixed(1)} m
        </Text>

        {task.task_mode === 'MEASURE_ONLY' ? (
          <View style={styles.noticeWarn}>
            <MaterialIcons name="lock" size={16} color={colors.warning} />
            <Text style={[typography.caption, styles.noticeWarnText]}>
              {BUSINESS_ERROR_MESSAGES.TASK_MODE_NOT_REPAIRABLE}
            </Text>
          </View>
        ) : evaluation.code === 'ELIGIBLE' ? (
          <View style={styles.noticePass}>
            <Chip variant="policy-pass" label="Đủ điều kiện sửa nhanh — Được phép sửa ngay" uppercase={false} />
          </View>
        ) : evaluation.code === 'NOT_ELIGIBLE' ? (
          <View style={styles.noticeWarn}>
            <MaterialIcons name="warning" size={16} color={colors.warning} />
            <Text style={[typography.caption, styles.noticeWarnText]}>
              {BUSINESS_ERROR_MESSAGES.FAST_TRACK_NOT_ELIGIBLE}
            </Text>
          </View>
        ) : (
          <Text style={[typography.caption, styles.hintText]}>
            Nhập đủ 3 kích thước để hệ thống đối chiếu điều kiện sửa nhanh.
          </Text>
        )}

        {primaryBlockedReason ? (
          <View style={styles.noticeWarn}>
            <MaterialIcons name="error-outline" size={16} color={colors.error} />
            <Text style={[typography.caption, styles.noticeErrorText]}>{primaryBlockedReason}</Text>
          </View>
        ) : null}
      </Card>

      <View style={styles.ctaRow}>
        <View style={styles.ctaSecondary}>
          <Button
            variant="secondary"
            title="Chỉ đường"
            onPress={() => router.push({ pathname: '/(crew)/navigation', params: { id: task.id } })}
          />
        </View>
        <View style={styles.ctaPrimary}>
          <Button
            variant="primary"
            title={primaryLabel}
            onPress={handlePrimaryAction}
            disabled={primaryDisabled || Boolean(primaryBlockedReason)}
          />
        </View>
      </View>

      {task.task_mode === 'MEASURE_ONLY' ? (
        <Text style={[typography.caption, styles.hintText]}>
          Nút chuyển sang sửa chữa bị khóa theo chế độ Chỉ đo đợt.
        </Text>
      ) : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  topBarTitle: {
    color: colors.neutral,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  cardTitleText: {
    color: colors.neutral,
    flexShrink: 1,
  },
  taskCode: {
    color: colors.secondary,
    flexShrink: 0,
  },
  defectTitle: {
    color: colors.neutral,
    marginTop: spacing.sm,
  },
  defectLocation: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  infoList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  infoText: {
    flex: 1,
    color: colors.neutral,
  },
  strong: {
    fontFamily: 'Roboto-Medium',
  },
  dueUrgent: {
    color: colors.error,
  },
  descriptionText: {
    color: colors.secondary,
    marginTop: spacing.md,
  },
  mapsButton: {
    marginTop: spacing.md,
  },
  selectedBefore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#E9F7EC',
  },
  selectedBeforeText: {
    flex: 1,
    color: colors.success,
  },
  candidateRow: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.sm,
  },
  candidateThumb: {
    width: '100%',
    height: 150,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  candidateThumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  candidateInfo: {
    gap: 2,
  },
  candidateSourceTag: {
    color: colors.brandGold,
  },
  candidateMeta: {
    color: colors.secondary,
  },
  noCandidate: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  noCandidateText: {
    flex: 1,
    color: colors.secondary,
  },
  captureButton: {
    marginTop: spacing.md,
  },
  hintText: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  measureGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  measureCol: {
    flex: 1,
  },
  quickPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetText: {
    fontSize: 11,
    color: colors.neutral,
  },
  areaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  areaLabel: {
    color: colors.secondary,
  },
  areaValue: {
    color: colors.neutral,
  },
  policyText: {
    color: colors.secondary,
    marginTop: spacing.sm,
  },
  noticePass: {
    marginTop: spacing.md,
    alignItems: 'flex-start',
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
    backgroundColor: 'rgba(245,158,11,0.1)',
  },
  noticeWarnText: {
    flex: 1,
    color: colors.brandGold,
  },
  noticeErrorText: {
    flex: 1,
    color: colors.error,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  ctaSecondary: {
    flex: 1,
  },
  ctaPrimary: {
    flex: 2,
  },
});
