import React, { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../design-tokens';

interface SafeAreaScreenProps {
  children: ReactNode;
  scroll?: boolean;
  header?: ReactNode;
  keyboardAware?: boolean;
}

const ProviderInsetsContext = React.createContext(false);

/** Opt in at a route-group boundary; this does not create a SafeAreaProvider. */
export function ProviderInsetScreens({ children }: { children: ReactNode }) {
  return <ProviderInsetsContext.Provider value={true}>{children}</ProviderInsetsContext.Provider>;
}

export function SafeAreaScreen({ children, scroll, header, keyboardAware = false }: SafeAreaScreenProps) {
  const providerInsets = React.useContext(ProviderInsetsContext);
  const insets = useSafeAreaInsets();
  // Crew Android native-stack reattachment can render native SafeAreaView with
  // zero padding while the provider already has valid insets. Commit the screen
  // and its padding together instead. Read the nearest provider (also in modals).
  const useProviderPadding = providerInsets && Platform.OS === 'android';
  const Container = useProviderPadding ? View : SafeAreaView;
  return (
    <Container
      style={[styles.safeArea, useProviderPadding && {
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }]}
      {...(useProviderPadding ? {} : { edges: ['top', 'left', 'right'] as const })}
    >
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
    </Container>
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
