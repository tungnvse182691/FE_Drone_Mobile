import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

type RequestSegment = 'waiting' | 'flying' | 'done';

interface MockRequest {
  id: string;
  name: string;
  segment: RequestSegment;
  urgent?: boolean;
  due: string;
}

const SEGMENTS: { key: RequestSegment; label: string; count: number }[] = [
  { key: 'waiting', label: 'Chờ nhận', count: 3 },
  { key: 'flying', label: 'Đang bay', count: 1 },
  { key: 'done', label: 'Đã xong', count: 12 },
];

const MOCK_REQUESTS: MockRequest[] = [
  {
    id: 'REQ-KS-089',
    name: 'Tuyến ĐT.741 - Cầu Sông Bé Km14+250',
    segment: 'waiting',
    urgent: true,
    due: 'Hết hạn 17:00 hôm nay',
  },
  {
    id: 'REQ-KS-090',
    name: 'QL.1A Đoạn Trảng Bom Km1842-Km1845',
    segment: 'waiting',
    due: 'Hết hạn 12:00 ngày mai',
  },
  {
    id: 'REQ-KS-088',
    name: 'Đường gom KCN Amata',
    segment: 'waiting',
    due: 'Hết hạn 09:00 ngày mai',
  },
];

export default function RequestsScreen() {
  const [segment, setSegment] = useState<RequestSegment>('waiting');

  const list = MOCK_REQUESTS.filter((r) => r.segment === segment);

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Khảo Sát" />}>
      <Text style={[typography.titleLg, styles.pageTitle]}>Yêu cầu khảo sát</Text>

      <View style={styles.segments}>
        {SEGMENTS.map((s) => {
          const active = s.key === segment;
          return (
            <Pressable
              key={s.key}
              style={[styles.segment, active && styles.segmentActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setSegment(s.key)}
            >
              <Text style={[typography.labelSm, active ? styles.segmentLabelActive : styles.segmentLabel]}>
                {s.label} ({s.count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {list.length === 0 ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Chưa có yêu cầu"
          message="Danh sách sẽ được tải khi có kết nối mạng."
        />
      ) : (
        list.map((item) => (
          <Pressable key={item.id} onPress={() => router.push('/(drone)/request-detail')}>
            <Card style={styles.requestCard}>
              <View style={styles.rowBetween}>
                <Text style={[typography.titleMd, styles.requestTitle]}>{item.id}</Text>
                {item.urgent ? <Chip variant="severity-high" label="Khẩn cấp" /> : null}
              </View>
              <Text style={[typography.bodyLg, styles.requestName]}>{item.name}</Text>
              <Text style={[typography.caption, styles.requestDue]}>{item.due}</Text>
            </Card>
          </Pressable>
        ))
      )}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    color: colors.neutral,
    marginBottom: spacing.lg,
  },
  segments: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestCard: {
    marginBottom: spacing.sm,
  },
  requestTitle: {
    color: colors.neutral,
  },
  requestName: {
    color: colors.neutral,
    marginTop: spacing.sm,
  },
  requestDue: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
});