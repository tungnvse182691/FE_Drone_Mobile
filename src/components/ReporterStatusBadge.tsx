import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../design-tokens';
import { ReporterReportStatus } from '../types/enums';

interface ReporterStatusBadgeProps {
  status: ReporterReportStatus;
}

const statusColors: Record<ReporterReportStatus, string> = {
  [ReporterReportStatus.SUBMITTED]: colors.secondary,
  [ReporterReportStatus.RECEIVED]: colors.info,
  [ReporterReportStatus.INSPECTING]: colors.warning,
  [ReporterReportStatus.REPAIRING]: colors.warning,
  [ReporterReportStatus.COMPLETED]: colors.success,
  [ReporterReportStatus.REJECTED]: colors.error,
};

const statusLabels: Record<ReporterReportStatus, string> = {
  [ReporterReportStatus.SUBMITTED]: 'Đã gửi',
  [ReporterReportStatus.RECEIVED]: 'Đã tiếp nhận',
  [ReporterReportStatus.INSPECTING]: 'Đang khảo sát',
  [ReporterReportStatus.REPAIRING]: 'Đang sửa chữa',
  [ReporterReportStatus.COMPLETED]: 'Hoàn thành nghiệm thu',
  [ReporterReportStatus.REJECTED]: 'Không hợp lệ',
};

export function ReporterStatusBadge({ status }: ReporterStatusBadgeProps) {
  const color = statusColors[status];

  return (
    <View style={styles.badge} testID={`reporter-status-${status}`}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[typography.labelSm, { color }]}>{statusLabels[status]}</Text>
    </View>
  );
}

export { statusLabels as reporterStatusLabels };

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
});
