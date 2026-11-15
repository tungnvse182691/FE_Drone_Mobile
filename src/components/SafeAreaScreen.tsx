import React, { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../design-tokens';

interface SafeAreaScreenProps {
  children: ReactNode;
  scroll?: boolean;
  header?: ReactNode;
  keyboardAware?: boolean;
}

export function SafeAreaScreen({ children, scroll, header, keyboardAware = false }: SafeAreaScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {header}
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, styles.scrollContent]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={keyboardAware}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  content: {
    padding: spacing.screenMargin,
  },
  scrollContent: {
    paddingBottom: 96,
  },
});
