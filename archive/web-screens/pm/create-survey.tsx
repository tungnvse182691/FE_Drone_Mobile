import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AlertButton } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { DatePickerField } from '../../src/components/DatePickerField';
import { InputField } from '../../src/components/InputField';
import { Toast } from '../../src/components/Toast';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

const PROJECTS = ['Tuyến ĐH.05 - Bình Chánh', 'Tuyến ĐH.01 - Củ Chi', 'Tuyến NT-08 - An Nhơn Tây'];

const REASONS = ['Định kỳ 6 tháng', 'Sau đợt mưa bão'];

const PRESETS = [
  { label: 'Hôm nay', delta: 0 },
  { label: 'Ngày mai', delta: 1 },
  { label: '3 ngày tới', delta: 3 },
];

const GUIDE_SUGGESTIONS = ['+ Bay độ cao 30m', '+ Quét 4K góc 90°', '+ Tập trung khe co giãn'];

type ToastMessage = {
  type: 'success' | 'error' | 'warning';
  message: string;
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toDateString(date: Date) {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDate(s: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

interface OptionChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
}

function OptionChip({ label, active = false, onPress }: OptionChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionChip,
        active && styles.optionChipActive,
        pressed && styles.optionChipPressed,
      ]}
      accessibilityRole="button"
    >
      <Text style={[typography.labelSm, styles.optionChipText, active && styles.optionChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

interface SelectRowProps {
  label: string;
  value: string;
  onPress: () => void;
}

function SelectRow({ label, value, onPress }: SelectRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.selectGroup} accessibilityRole="button">
      <Text style={[typography.labelLg, styles.fieldLabel]}>{label}</Text>
      <View style={styles.selectBox}>
        <Text style={[typography.bodyLg, styles.selectValue]} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.secondary} />
      </View>
    </Pressable>
  );
}

export default function PmCreateSurveyScreen() {
  const [project, setProject] = useState('Tuyến ĐH.05 - Bình Chánh');
  const [segment, setSegment] = useState('Km02 - Km04');
  const [reason, setReason] = useState('Định kỳ 6 tháng');
  const [altitude, setAltitude] = useState('45');
  const [flightDate, setFlightDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [guide, setGuide] = useState(
    'Bay quét 4K độ cao 30-35m dọc tim đường. Ghi nhận video 4K kèm phụ đề GPS .SRT.',
  );
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const pickProject = () => {
    const options: AlertButton[] = PROJECTS.map((p) => ({ text: p, onPress: () => setProject(p) }));
    options.push({ text: 'Bỏ qua', style: 'cancel' });
    Alert.alert('Chọn dự án', undefined, options);
  };

  const applyPreset = (delta: number) => {
    const value = toDateString(addDays(new Date(), delta));
    setFlightDate(value);
    setDeadline(value);
  };

  const appendSuggestion = (suggestion: string) => {
    setGuide((prev) => (prev.includes(suggestion) ? prev : prev ? `${prev} ${suggestion}` : suggestion));
  };

  const handleSubmit = () => {
    const flightRaw = flightDate.trim();
    const deadRaw = deadline.trim();

    if (!flightRaw || !deadRaw) {
      setToast({ type: 'warning', message: '⚠️ Vui lòng chọn Ngày bay dự kiến và Hạn nộp video!' });
      return;
    }

    const flight = parseDate(flightRaw);
    const dead = parseDate(deadRaw);
    if (!flight || !dead || dead.getTime() < flight.getTime()) {
      setToast({
        type: 'error',
        message: `❌ Hạn nộp video (${deadRaw}) phải cùng ngày hoặc sau Ngày bay dự kiến (${flightRaw})!`,
      });
      return;
    }

    setToast({
      type: 'success',
      message: `✅ Đã phát hành yêu cầu khảo sát cho Phi công Nguyễn Văn An! (Ngày bay: ${flightRaw} - Hạn nộp: ${deadRaw})`,
    });
    setTimeout(() => router.push('/(pm)/surveys'), 1200);
  };

  return (
    <View style={styles.screen}>
      <SafeAreaScreen
        scroll
        header={<AppHeader subtitle="Khảo Sát" showBack fallbackRoute="/(pm)/surveys" />}
      >
        <Card style={styles.formCard}>
          <Text style={[typography.titleMd, styles.cardTitle]}>Thông tin khảo sát</Text>
          <SelectRow label="Dự án" value={project} onPress={pickProject} />
          <InputField
            label="Phân đoạn khảo sát"
            value={segment}
            onChangeText={setSegment}
            placeholder="Ví dụ: Km02 - Km04"
          />
          <View style={styles.fieldGroup}>
            <Text style={[typography.labelLg, styles.fieldLabel]}>Lý do khảo sát</Text>
            <View style={styles.optionRow}>
              {REASONS.map((r) => (
                <OptionChip key={r} label={r} active={reason === r} onPress={() => setReason(r)} />
              ))}
            </View>
          </View>
          <InputField label="Cao độ bay (m)" value={altitude} onChangeText={setAltitude} placeholder="45" />
          <Text style={[typography.caption, styles.fieldHint]}>
            Thiết lập độ phân giải GSD &lt; 1.2 cm/pixel
          </Text>
        </Card>

        <Card style={styles.formCard}>
          <Text style={[typography.titleMd, styles.cardTitle]}>Phân công người bay</Text>
          <View style={styles.crewRow}>
            <View style={styles.crewAvatar}>
              <Ionicons name="person" size={18} color={colors.primaryDark} />
            </View>
            <View style={styles.crewInfo}>
              <Text style={[typography.titleMd, styles.crewName]}>Nguyễn Văn An</Text>
              <Text style={[typography.caption, styles.crewMeta]}>Đội Bay 01</Text>
            </View>
            <View style={styles.crewBadge}>
              <View style={styles.crewDot} />
              <Text style={[typography.labelSm, styles.crewBadgeText]}>Đang rảnh</Text>
            </View>
          </View>
        </Card>

        <View style={styles.scheduleHeader}>
          <Ionicons name="calendar" size={16} color={colors.primary} />
          <Text style={[typography.titleMd, styles.scheduleTitle]}>
            Lịch bay &amp; Kế hoạch khảo sát <Text style={styles.requiredStar}>*</Text>
          </Text>
        </View>

        <View style={styles.optionRow}>
          {PRESETS.map((preset) => (
            <OptionChip key={preset.label} label={preset.label} onPress={() => applyPreset(preset.delta)} />
          ))}
        </View>

        <DatePickerField
          label="Ngày bay dự kiến *"
          value={flightDate}
          onChange={(val) => {
            setFlightDate(val);
            const flight = parseDate(val);
            const dead = parseDate(deadline);
            if (flight && (!dead || dead.getTime() < flight.getTime())) {
              setDeadline(val);
            }
          }}
          placeholder="Chọn ngày (DD/MM/YYYY)"
        />
        <DatePickerField
          label="Hạn nộp video *"
          value={deadline}
          onChange={setDeadline}
          minDate={parseDate(flightDate) || undefined}
          placeholder="Chọn ngày (DD/MM/YYYY)"
        />
        <Text style={[typography.caption, styles.ruleHint]}>
          Hạn nộp video phải cùng ngày hoặc sau Ngày bay dự kiến.
        </Text>

        <Card style={styles.formCard}>
          <Text style={[typography.titleMd, styles.cardTitle]}>Hướng dẫn cho người bay</Text>
          <TextInput
            multiline
            style={styles.guideInput}
            value={guide}
            onChangeText={setGuide}
            placeholder="Hướng dẫn chi tiết cho phi công..."
            placeholderTextColor={colors.secondary}
            textAlignVertical="top"
          />
          <View style={styles.optionRow}>
            {GUIDE_SUGGESTIONS.map((suggestion) => (
              <OptionChip key={suggestion} label={suggestion} onPress={() => appendSuggestion(suggestion)} />
            ))}
          </View>
        </Card>

        <Button variant="primary" title="Tạo yêu cầu" onPress={handleSubmit} />
      </SafeAreaScreen>

      {toast ? <Toast type={toast.type} message={toast.message} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  formCard: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.neutral,
    marginBottom: spacing.md,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  fieldHint: {
    color: colors.secondary,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  selectGroup: {
    marginBottom: spacing.md,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  selectValue: {
    color: colors.onSurface,
    flex: 1,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  optionChip: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionChipPressed: {
    opacity: 0.7,
  },
  optionChipText: {
    color: colors.onSurface,
  },
  optionChipTextActive: {
    color: colors.onPrimary,
    fontWeight: '500',
  },
  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  crewAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  crewInfo: {
    flex: 1,
  },
  crewName: {
    color: colors.neutral,
  },
  crewMeta: {
    color: colors.secondary,
    marginTop: 2,
  },
  crewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: '#E9F7EC',
  },
  crewDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  crewBadgeText: {
    color: colors.success,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  scheduleTitle: {
    color: colors.neutral,
  },
  requiredStar: {
    color: colors.error,
  },
  ruleHint: {
    color: colors.secondary,
    marginBottom: spacing.md,
  },
  guideInput: {
    minHeight: 96,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    ...typography.bodyLg,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
});