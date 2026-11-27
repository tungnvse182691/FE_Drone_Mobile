import React, { useCallback, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, type ScrollViewInstance } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AppHeader } from '../../src/components/AppHeader';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { CrewHandoverPanel } from '../../src/components/crew/CrewHandoverPanel';
import { CREW_SYNC } from '../../src/constants/routes';
import { spacing } from '../../src/design-tokens';
import { currentQueueIdentity } from '../../src/offline/upload-queue';
import { useAuthStore } from '../../src/store/auth';

export default function CrewHandoverScreen() {
  useAuthStore(state => state.token);
  useAuthStore(state => state.user);
  useAuthStore(state => state.status);
  const identity = currentQueueIdentity();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const revealFocusedInput = useCallback(() => {
    if (Platform.OS !== 'android' || !Keyboard.isVisible()) return;
    const scroll = scrollRef.current;
    const input = TextInput.State.currentlyFocusedInput();
    if (!scroll || !input) return;
    scroll.getNativeScrollRef()?.measureInWindow((_x, top) => {
      if (scrollRef.current !== scroll || TextInput.State.currentlyFocusedInput() !== input || !Keyboard.isVisible()) return;
      // Allow room for the fixed header and the next control below the focused field.
      scroll.scrollResponderScrollNativeHandleToKeyboard(input, top + 48 + spacing.lg, true);
    });
  }, []);
  useFocusEffect(useCallback(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', revealFocusedInput);
    return () => subscription.remove();
  }, [revealFocusedInput]));

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'android' ? 'padding' : undefined}>
      <SafeAreaScreen
        scroll keyboardAware scrollRef={scrollRef} onScrollLayout={revealFocusedInput}
        header={<AppHeader subtitle="Bàn giao hồ sơ" showBack fallbackRoute={CREW_SYNC} />}
      >
        {identity?.role === 'REPAIR_CREW'
          ? <CrewHandoverPanel key={JSON.stringify(identity)} identity={identity} onSupportInputFocus={revealFocusedInput} />
          : <Text>Cần phiên đội sửa chữa hợp lệ.</Text>}
      </SafeAreaScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });
