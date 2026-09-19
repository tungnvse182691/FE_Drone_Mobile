import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { FAB } from '../../src/components/FAB';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

type SurveyGroup = 'Đang bay' | 'Đã gửi video' | 'Chờ bay';
type SurveyChip = 'status-pending' | 'approved' | 'severity-medium';
type SurveyFilter = SurveyGroup | 'all';

interface SurveyItem {
  id: string;
  title: string;
  group: SurveyGroup;
  chip: SurveyChip;
  chipLabel: string;
  team: string;
  cancellable?: boolean;
}

const GROUPS: SurveyGroup[] = ['Đang bay', 'Đã gửi video', 'Chờ bay'];

const INITIAL_SURVEYS: SurveyItem[] = [
  {
    id: 'KS12',
    title: 'ĐT.741 — Cầu Sông Bé (Km14+250)',
    group: 'Đang bay',
    chip: 'status-pending',
    chipLabel: 'Đang thực hiện',
    team: 'Đội Bay 01 (Phan Văn Nam)',
  },
  {
    id: 'KS11',
    title: 'QL.1A — Đoạn Trảng Bom (Km1842+100 - Km1845)',
    group: 'Đã gửi video',
    chip: 'approved',
    chipLabel: 'Đã gửi video',
    team: 'Đội Bay 02 (Lê Minh Tuấn)',
  },
  {
    id: 'KS14',
    title: 'Đường gom KCN Amata — Biên Hòa (Km02 - Km05)',
    group: 'Chờ bay',
    chip: 'severity-medium',
    chipLabel: 'Mới',
    team: 'Chưa phân công',
    cancellable: true,
  },
];

export default function PmSurveysScreen() {
  const [surveys, setSurveys] = useState(INITIAL_SURVEYS);
  const [filter, setFilter] = useState<SurveyFilter>('all');

  const visibleSurveys = surveys.filter((s) => filter === 'all' || s.group === filter);

  const handleCancel = (item: SurveyItem) => {
    Alert.alert(
      'Hủy đợt khảo sát?',
      `Xác nhận hủy đợt khảo sát\n${item.title}?`,
      [
        { text: 'Bỏ qua', style: 'cancel' },
        {
          text: 'Hủy (KS14)',
          style: 'destructive',
          onPress: () => setSurveys((prev) => prev.filter((s) => s.id !== item.id)),
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <SafeAreaScreen scroll header={<AppHeader subtitle="Khảo Sát" />}>
        <View style={styles.countRow}>
          {GROUPS.map((group) => {
            const count = surveys.filter((s) => s.group === group).length;
            const active = filter === group;
            return (
              <Pressable
                key={group}
                onPress={() => setFilter(active ? 'all' : group)}
                style={[styles.countChip, active && styles.countChipActive]}
                accessibilityRole="button"
              >
                <Text style={[typography.labelSm, styles.countNum, active && styles.countNumActive]}>
                  {String(count).padStart(2, '0')}
                </Text>
                <Text style={[typography.labelSm, styles.countLabel, active && styles.countLabelActive]}>
                  {group}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[typography.titleMd, styles.sectionTitle]}>Danh sách đợt khảo sát</Text>
        </View>

        {visibleSurveys.length === 0 ? (
          <Text style={[typography.bodyMd, styles.empty]}>Chưa có đợt khảo sát nào.</Text>
        ) : (
          visibleSurveys.map((item) => (
            <Card key={item.id} style={styles.surveyCard}>
              <View style={styles.surveyMetaRow}>
                <Chip variant={item.chip} label={item.chipLabel} />
                <Text style={[typography.labelSm, styles.surveyCode]}>{item.id}</Text>
              </View>
              <Text style={[typography.titleMd, styles.surveyTitle]}>{item.title}</Text>
              <View style={styles.surveyTeamRow}>
                <Ionicons name="people-outline" size={14} color={colors.secondary} />
                <Text style={[typography.caption, styles.surveyTeam]}>{item.team}</Text>
                {item.cancellable ? (
                  <Pressable onPress={() => handleCancel(item)} accessibilityRole="button">
                    <Text style={[typography.labelSm, styles.cancelBtn]}>Hủy (KS14)</Text>
                  </Pressable>
                ) : null}
              </View>
            </Card>
          ))
        )}
      </SafeAreaScreen>

      <FAB icon="add" onPress={() => router.push('/(pm)/create-survey')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  countChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  countNum: {
    color: colors.primary,
    fontWeight: '700',
  },
  countNumActive: {
    color: colors.surface,
  },
  countLabel: {
    color: colors.secondary,
  },
  countLabelActive: {
    color: colors.surface,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.neutral,
  },
  empty: {
    color: colors.secondary,
  },
  surveyCard: {
    marginBottom: spacing.sm,
  },
  surveyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  surveyCode: {
    color: colors.secondary,
    marginLeft: 'auto',
  },
  surveyTitle: {
    color: colors.neutral,
    marginTop: spacing.sm,
  },
  surveyTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  surveyTeam: {
    color: colors.secondary,
    flex: 1,
  },
  cancelBtn: {
    color: colors.error,
  },
});