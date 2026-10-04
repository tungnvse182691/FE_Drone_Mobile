import React from 'react';
import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../design-tokens';

interface InputFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  autoFocus?: boolean;
  testID?: string;
  unit?: string;
  minHeight?: number;
}

export function InputField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  multiline,
  numberOfLines,
  autoFocus,
  testID,
  unit,
  minHeight,
}: InputFieldProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={[typography.labelLg, styles.label]}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          !!error && styles.inputRowError,
          minHeight ? { minHeight } : null,
        ]}
      >
        <TextInput
          style={[
            styles.input,
            multiline ? styles.inputMultiline : null,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.secondary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? (secureTextEntry ? 'none' : 'none')}
          multiline={multiline}
          numberOfLines={numberOfLines ?? (multiline ? 4 : undefined)}
          textAlignVertical={multiline ? 'top' : 'center'}
          autoFocus={autoFocus}
          testID={testID}
        />
        {unit ? <Text style={[typography.labelSm, styles.unit]}>{unit}</Text> : null}
      </View>
      {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  inputRowError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    ...typography.bodyLg,
    color: colors.onSurface,
  },
  inputMultiline: {
    minHeight: 96,
  },
  unit: {
    paddingHorizontal: spacing.md,
    color: colors.secondary,
  },
  error: {
    color: colors.error,
    marginTop: spacing.xs,
  },
});