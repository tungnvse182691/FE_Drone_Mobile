import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, typography } from '../design-tokens';

/** Presentation only. Status colors never grant task permissions. */
export function crewTaskStatusStyle(status?: string | null) {
  const value = status?.toUpperCase();
  if (value === 'NEWASSIGNED' || value === 'ASSIGNED') return { background: '#FFF4E5', foreground: '#92400E', icon: 'schedule' as const };
  if (value === 'ACCEPTED') return { background: '#EAF2FF', foreground: '#1D4ED8', icon: 'assignment-turned-in' as const };
  if (value === 'INPROGRESS' || value === 'STARTED') return { background: '#E6F6F5', foreground: '#0F766E', icon: 'build' as const };
  if (value === 'SUBMITTED') return { background: '#EDF2F6', foreground: '#40566B', icon: 'upload-file' as const };
  if (value === 'COMPLETED') return { background: '#E8F5E9', foreground: '#166534', icon: 'check-circle' as const };
  if (value === 'SUPPLEMENTREQUIRED') return { background: '#FFF0E8', foreground: '#9A3412', icon: 'edit-note' as const };
  if (value === 'REJECTED') return { background: '#FDECEC', foreground: '#B91C1C', icon: 'cancel' as const };
  return { background: colors.surfaceAlt, foreground: colors.secondary, icon: 'info-outline' as const };
}

export function CrewTaskStatus({ status, label }: { status?: string | null; label: string }) {
  const tone = crewTaskStatusStyle(status);
  return <View style={[styles.badge, { backgroundColor: tone.background }]}>
    <MaterialIcons name={tone.icon} color={tone.foreground} size={16}/>
    <Text style={[styles.label, { color: tone.foreground }]}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: '100%', gap: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: radius.md },
  label: { ...typography.labelSm, fontSize: 12, lineHeight: 18, flexShrink: 1 },
});
