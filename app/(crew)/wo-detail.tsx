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

  const primaryDisabled = !measureReady || !beforeSelected;
  const primaryBlockedReason = !measureReady
    ? 'Cần nhập đủ 3 kích thước để tiếp tục'
    : !beforeSelected
      ? BUSINESS_ERROR_MESSAGES.BEFORE_MISSING
      : null;

  return (
    <SafeAreaScreen
      scroll
      header={
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              hitSlop={8}
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.neutral} />
            </Pressable>
            <Text style={[typography.titleMd, styles.topBarTitle]}>Chi tiết lệnh công tác</Text>
          </View>
          <Chip variant={modeChip.variant} label={modeChip.label} uppercase={false} />
        </View>
      }
    >
      {/* CARD 1: Thông tin kỹ thuật (gom 2 nhóm: Vị trí + Thời hạn) */}
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

        {/* Nhóm 1: Vị trí hiện trường */}
        <View style={styles.groupSection}>
          <Text style={[typography.labelSm, styles.groupHeaderTitle]}>VỊ TRÍ HIỆN TRƯỜNG</Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <MaterialIcons name="alt-route" size={16} color={colors.brandGold} />
              <Text style={[typography.bodyMd, styles.infoText]}>
                Tuyến đường: <Text style={styles.strong}>{task.route_code}</Text> • Phân đoạn{' '}
                <Text style={styles.strong}>{task.section_name}</Text> • Lý trình{' '}
                <Text style={styles.strong}>{task.chainage}</Text>
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={16} color={colors.brandGold} />
              <Text style={[typography.bodyMd, styles.infoText]}>
                Vị trí: <Text style={styles.strong}>{task.defect_location}</Text> ({task.locality})
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="navigation" size={16} color={colors.brandGold} />
              <View style={styles.coordWrap}>
                <Text style={[typography.bodyMd, styles.infoText]}>Tọa độ WGS84: </Text>
                <Text
                  selectable={true}
                  style={[typography.bodyMd, styles.strong, styles.coordValue]}
                >
                  {task.coordinates.latitude.toFixed(6)}° B, {task.coordinates.longitude.toFixed(6)}° Đ
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Nhóm 2: Thời hạn & Yêu cầu */}
        <View style={styles.groupSection}>
          <Text style={[typography.labelSm, styles.groupHeaderTitle]}>THỜI HẠN & MÔ TẢ</Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <MaterialIcons name="info-outline" size={16} color={colors.brandGold} />
              <Text style={[typography.bodyMd, styles.infoText]}>
                Loại lỗi: <Text style={styles.strong}>{defectTypeLabel(task.defect_type_code)}</Text>
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons
                name={task.due_urgency === 'urgent' ? 'alarm' : 'access-time'}
                size={16}
                color={task.due_urgency === 'urgent' ? colors.error : colors.brandGold}
              />
              <Text style={[typography.bodyMd, styles.infoText]}>
                Thời hạn:{' '}
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
        </View>

        {/* Nút Google Maps secondary */}
        <Button
          variant="secondary"
          title="Dẫn đường Google Maps"
          icon={<MaterialIcons name="directions" size={18} color={colors.neutral} />}
          onPress={openGoogleMaps}
          style={styles.mapsButton}
        />
      </Card>

      {/* CARD 2: Ảnh hiện trạng đối chứng */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="photo-camera" size={16} color={colors.brandGold} />
            <Text style={[typography.titleMd, styles.cardTitleText]}>Ảnh hiện trạng</Text>
          </View>
          <Text style={[typography.labelSm, styles.taskCode]}>Đối chứng BEFORE</Text>
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
                    <MaterialIcons name="image" size={24} color={colors.secondary} />
                  </View>
                )}
                <View style={styles.candidateInfo}>
                  <View style={styles.sourceTagBadge}>
                    <MaterialIcons name="photo-library" size={12} color={colors.brandGold} />
                    <Text
                      style={[typography.labelSm, styles.candidateSourceTag]}
                      numberOfLines={1}
                    >
                      [{EVIDENCE_REUSE_SOURCE_TAGS[candidate.source]}]
                    </Text>
                  </View>

                  <Text style={[typography.bodyMd, styles.candidateLabelText]}>
                    {candidate.source_label}
                  </Text>

                  <View style={styles.candidateMetaRow}>
                    <Text style={[typography.caption, styles.candidateMeta]} numberOfLines={1}>
                      Chụp {formatCapturedAt(candidate.captured_at)}
                    </Text>
                    <Text style={[typography.caption, styles.candidateMeta]} numberOfLines={1}>
                      {candidate.coordinates.latitude.toFixed(5)}° B,{' '}
                      {candidate.coordinates.longitude.toFixed(5)}° Đ
                    </Text>
                  </View>
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

      {/* CARD 3: Kích thước hư hại */}
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

        {/* 3 ô nhập dài/rộng/sâu cao tối thiểu 48px dễ bấm */}
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
              minHeight={48}
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
              minHeight={48}
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
              minHeight={48}
            />
          </View>
        </View>

        <View style={styles.quickPresetRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Điền mẫu đạt policy"
            onPress={() => {
              setLengthText('1.2');
              setWidthText('0.6');
              setDepthText('3.0');
              handleMeasurement({ length_m: 1.2, width_m: 0.6, depth_cm: 3.0 });
            }}
            style={({ pressed }) => [styles.presetChip, pressed && styles.pressed]}
          >
            <Text style={[typography.caption, styles.presetText]}>
              Mẫu đạt policy: 1.2m × 0.6m × 3cm
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Điền mẫu vượt policy"
            onPress={() => {
              setLengthText('2.5');
              setWidthText('1.2');
              setDepthText('8.0');
              handleMeasurement({ length_m: 2.5, width_m: 1.2, depth_cm: 8.0 });
            }}
            style={({ pressed }) => [styles.presetChip, pressed && styles.pressed]}
          >
            <Text style={[typography.caption, styles.presetText]}>
              Mẫu vượt policy: 2.5m × 1.2m × 8cm
            </Text>
          </Pressable>
        </View>

        {/* Box diện tích L x W */}
        <View style={styles.areaBox}>
          <Text style={[typography.caption, styles.areaLabel]}>Diện tích tự động tính (L × W)</Text>
          <Text style={[typography.titleLg, styles.areaValue]}>
            {evaluation.area_m2 === null ? '—' : `${evaluation.area_m2.toFixed(2)} m²`}
          </Text>
        </View>

        {/* Text ngưỡng quy chuẩn */}
        <Text style={[typography.caption, styles.policyText]}>
          Ngưỡng quy chuẩn: diện tích ≤ {FAST_TRACK_POLICY.max_area_m2.toFixed(1)} m² • độ sâu ≤{' '}
          {FAST_TRACK_POLICY.max_depth_cm.toFixed(1)} cm • chiều dài ≤{' '}
          {FAST_TRACK_POLICY.max_length_m.toFixed(1)} m
        </Text>

        {/* Phản hồi trạng thái Policy */}
        {task.task_mode === 'MEASURE_ONLY' ? (
          <View style={styles.noticeWarn}>
            <MaterialIcons name="lock" size={16} color={colors.warning} />
            <Text style={[typography.caption, styles.noticeWarnText]}>
              {BUSINESS_ERROR_MESSAGES.TASK_MODE_NOT_REPAIRABLE}
            </Text>
          </View>
        ) : evaluation.code === 'ELIGIBLE' ? (
          <View style={styles.noticePass}>
            <Chip variant="policy-pass" label="[Đạt Policy Sửa Nhanh]" uppercase={false} />
          </View>
        ) : evaluation.code === 'NOT_ELIGIBLE' ? (
          <View style={styles.noticeFail}>
            <Chip variant="policy-fail" label="[Vượt Policy - Chuyển PM]" uppercase={false} />
            <View style={styles.policyGuideRow}>
              <MaterialIcons name="info-outline" size={14} color={colors.secondary} />
              <Text style={[typography.caption, styles.policyGuideText]}>
                Kích thước vượt ngưỡng sửa nhanh; lưu số đo và gửi báo cáo về PM.
              </Text>
            </View>
          </View>
        ) : (
          <Text style={[typography.caption, styles.hintText]}>
            Nhập đủ 3 kích thước để hệ thống đối chiếu điều kiện sửa nhanh.
          </Text>
        )}
      </Card>

      {/* CTA cuối: Chỉ đường (flex 1) + Tiến hành sửa nhanh (flex 2) + lý do disable */}
      <View style={styles.ctaContainer}>
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
              disabled={primaryDisabled}
            />
          </View>
        </View>

        {primaryDisabled ? (
          <View style={styles.disabledReasonBox}>
            <MaterialIcons name="info-outline" size={14} color={colors.error} />
            <Text style={[typography.caption, styles.disabledReasonText]}>
              {primaryBlockedReason}
            </Text>
          </View>
        ) : null}
      </View>
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
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  topBarTitle: {
    color: colors.neutral,
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
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
  groupSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  groupHeaderTitle: {
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  infoList: {
    gap: spacing.xs,
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
  coordWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  coordValue: {
    color: colors.neutral,
    textDecorationLine: 'underline',
  },
  strong: {
    fontFamily: 'Roboto-Medium',
  },
  dueUrgent: {
    color: colors.error,
  },
  descriptionText: {
    color: colors.secondary,
    marginTop: spacing.xs,
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
    gap: spacing.xs,
  },
  sourceTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    maxWidth: '100%',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: '#FEF9E7',
  },
  candidateSourceTag: {
    flexShrink: 1,
    color: colors.brandGold,
  },
  candidateLabelText: {
    color: colors.neutral,
    flexShrink: 1,
  },
  candidateMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  candidateMeta: {
    color: colors.secondary,
    flexShrink: 1,
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
    marginTop: spacing.sm,
  },
  measureCol: {
    flex: 1,
    minWidth: 0,
  },
  quickPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  presetChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetText: {
    color: colors.secondary,
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
    marginTop: spacing.xs,
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
  noticeFail: {
    marginTop: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  policyGuideRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  policyGuideText: {
    flex: 1,
    color: colors.secondary,
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
  /* paddingBottom 48: nhô CTA + dòng lý do disable khỏi gesture bar Android & BottomNav */
  ctaContainer: {
    paddingTop: spacing.xs,
    paddingBottom: 48,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ctaSecondary: {
    flex: 1,
  },
  ctaPrimary: {
    flex: 2,
  },
  disabledReasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  disabledReasonText: {
    color: colors.error,
    textAlign: 'center',
  },
});
