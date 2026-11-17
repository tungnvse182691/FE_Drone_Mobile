import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

/** Crew-only opt-in. Stay static until the OS preference is known; listen live. */
function useCrewReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true, changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      if (active) setReduced(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active && !changed) setReduced(value);
    }).catch(() => { /* Unknown accessibility preference stays static. */ });
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}

const MotionPressable = Animated.createAnimatedComponent(Pressable);
type CrewPressableProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};

/** Feedback only: the original onPress, disabled state and accessible name pass through. */
export function CrewPressable({ style, disabled, onPressIn, onPressOut, android_ripple, ...props }: CrewPressableProps) {
  const reduced = useCrewReducedMotion();
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  useEffect(() => {
    cancelAnimation(scale);
    scale.value = 1;
    if (disabled) setPressed(false);
    return () => cancelAnimation(scale);
  }, [reduced, disabled, scale]);
  return <MotionPressable {...props} disabled={disabled}
    android_ripple={android_ripple ?? { color: '#1A1D2029', foreground: true }}
    style={[typeof style === 'function' ? style({ pressed }) : style, animatedStyle]}
    onPressIn={event => {
      if (disabled) return;
      setPressed(true);
      if (!reduced) scale.value = withTiming(0.96, { duration: 100, reduceMotion: ReduceMotion.System });
      onPressIn?.(event);
    }}
    onPressOut={event => {
      setPressed(false);
      if (!reduced && !disabled) scale.value = withTiming(1, { duration: 180, reduceMotion: ReduceMotion.System });
      else scale.value = 1;
      onPressOut?.(event);
    }} />;
}

/** Never remount children, delay actions, or turn a visual transition into a receipt. */
export function CrewContentTransition({ ready, revision, replayOnFocus = false, children }: { ready: boolean; revision?: number; replayOnFocus?: boolean; children: React.ReactNode }) {
  const reduced = useCrewReducedMotion();
  const [focusRevision, setFocusRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    if (replayOnFocus) setFocusRevision(value => value + 1);
  }, [replayOnFocus]));
  const progress = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ opacity: 0.25 + 0.75 * progress.value, transform: [{ translateY: 18 * (1 - progress.value) }] }));
  useEffect(() => {
    cancelAnimation(progress);
    if (reduced || !ready) progress.value = 1;
    else {
      progress.value = 0;
      progress.value = withTiming(1, { duration: 280, reduceMotion: ReduceMotion.System });
    }
    return () => cancelAnimation(progress);
  }, [ready, revision, focusRevision, reduced, progress]);
  return <Animated.View style={style}>{children}</Animated.View>;
}
