import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../design-tokens';

export interface DatePickerFieldProps {
  label?: string;
  value: string; // Format "DD/MM/YYYY"
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function parseDate(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

export function toDateString(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function toIsoString(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fromIsoString(isoStr: string): string {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Chọn ngày (DD/MM/YYYY)',
  error,
  minDate,
  maxDate,
}: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [iosTempDate, setIosTempDate] = useState<Date>(new Date());

  const currentDate = parseDate(value) || new Date();

  // On Web: render native HTML5 date picker (<input type="date" />)
  if (Platform.OS === 'web') {
    const isoVal = toIsoString(value);
    const minIso = minDate ? toIsoString(toDateString(minDate)) : undefined;
    const maxIso = maxDate ? toIsoString(toDateString(maxDate)) : undefined;

    return (
      <View style={styles.container}>
        {label ? <Text style={[typography.labelLg, styles.label]}>{label}</Text> : null}
        <View style={[styles.box, !!error && styles.boxError]}>
          <Ionicons name="calendar-outline" size={18} color={colors.secondary} style={styles.icon} />
          {React.createElement('input', {
            type: 'date',
            value: isoVal,
            min: minIso,
            max: maxIso,
            onChange: (e: any) => {
              const val = e?.target?.value;
              if (val) {
                onChange(fromIsoString(val));
              }
            },
            style: {
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              flex: 1,
              width: '100%',
              fontSize: 16,
              color: value ? colors.onSurface : colors.secondary,
              fontFamily: 'inherit',
              cursor: 'pointer',
              padding: '2px 0',
            },
          })}
        </View>
        {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}
      </View>
    );
  }

  // On Android & iOS: Native DateTimePicker
  const handleNativeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate) {
        onChange(toDateString(selectedDate));
      }
    } else if (Platform.OS === 'ios') {
      if (selectedDate) {
        setIosTempDate(selectedDate);
      }
    }
  };

  const openPicker = () => {
    setIosTempDate(currentDate);
    setShowPicker(true);
  };

  const handleIosConfirm = () => {
    onChange(toDateString(iosTempDate));
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={[typography.labelLg, styles.label]}>{label}</Text> : null}
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [
          styles.box,
          !!error && styles.boxError,
          pressed && styles.boxPressed,
        ]}
        accessibilityRole="button"
      >
        <Ionicons name="calendar-outline" size={18} color={colors.secondary} style={styles.icon} />
        <Text
          style={[
            typography.bodyLg,
            styles.valueText,
            !value && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.secondary} />
      </Pressable>

      {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}

      {/* Android: Material DatePickerDialog */}
      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          minimumDate={minDate}
          maximumDate={maxDate}
          onChange={handleNativeChange}
        />
      ) : null}

      {/* iOS: Modal with DateTimePicker */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.iosPickerContainer}>
              <View style={styles.iosHeader}>
                <Pressable onPress={() => setShowPicker(false)}>
                  <Text style={[typography.labelLg, { color: colors.secondary }]}>Hủy</Text>
                </Pressable>
                <Text style={[typography.titleMd, { color: colors.neutral }]}>Chọn ngày</Text>
                <Pressable onPress={handleIosConfirm}>
                  <Text style={[typography.labelLg, { color: colors.primary, fontWeight: '700' }]}>
                    Xong
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={iosTempDate}
                mode="date"
                display="spinner"
                minimumDate={minDate}
                maximumDate={maxDate}
                onChange={handleNativeChange}
                textColor={colors.onSurface}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  boxError: {
    borderColor: colors.error,
  },
  boxPressed: {
    opacity: 0.8,
  },
  icon: {
    marginRight: spacing.sm,
  },
  valueText: {
    flex: 1,
    color: colors.onSurface,
  },
  placeholderText: {
    color: colors.secondary,
  },
  error: {
    color: colors.error,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  iosPickerContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 32,
  },
  iosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
