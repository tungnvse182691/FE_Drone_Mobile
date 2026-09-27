import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../design-tokens';
import { TrackingTimelineEvent } from '../types/domain';

interface TrackingTimelineProps {
  events: TrackingTimelineEvent[];
}

export function TrackingTimeline({ events }: TrackingTimelineProps) {
  return (
    <View style={styles.container}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;

        return (
          <View key={`${event.step}-${index}`} style={styles.row}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.marker,
                  event.completed ? styles.markerCompleted : styles.markerPending,
                ]}
              >
                <MaterialIcons
                  name={event.completed ? 'check' : 'more-horiz'}
                  size={14}
                  color={event.completed ? colors.onPrimary : colors.secondary}
                />
              </View>
              {!isLast ? (
                <View
                  style={[
                    styles.line,
                    events[index + 1].completed ? styles.lineCompleted : styles.linePending,
                  ]}
                />
              ) : null}
            </View>

            <View style={styles.content}>
              <Text
                style={[
                  typography.titleMd,
                  { color: event.completed ? colors.onSurface : colors.secondary },
                ]}
              >
                {event.label}
              </Text>
              <Text style={[typography.caption, styles.description]}>{event.description}</Text>
              {event.occurred_at ? (
                <View style={styles.timeRow}>
                  <MaterialIcons name="schedule" size={12} color={colors.secondary} />
                  <Text style={[typography.caption, styles.time]}>
                    {formatTimestamp(event.occurred_at)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    alignItems: 'center',
    width: 28,
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerCompleted: {
    backgroundColor: colors.success,
  },
  markerPending: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  line: {
    flex: 1,
    width: 2,
    marginVertical: 2,
  },
  lineCompleted: {
    backgroundColor: colors.success,
  },
  linePending: {
    backgroundColor: colors.border,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  description: {
    color: colors.secondary,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  time: {
    color: colors.secondary,
  },
});
