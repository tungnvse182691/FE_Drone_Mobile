import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, type PressableProps } from 'react-native';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

/** Home task feedback only. Native Pressable keeps scroll cancellation and immediate navigation. */
export function CrewHomeTaskPressable({ disabled, onPressIn, onPressOut, ...props }: PressableProps) {
  const [reduced, setReduced] = useState(true);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    let active = true, changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      if (active) setReduced(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active && !changed) setReduced(value);
    }).catch(() => { /* Unknown preference stays static. */ });
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    cancelAnimation(scale);
    scale.value = 1;
    return () => cancelAnimation(scale);
  }, [reduced, disabled, scale]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable {...props} disabled={disabled}
        onPressIn={event => {
          if (disabled) return;
          if (!reduced) scale.value = withTiming(0.97, { duration: 80, reduceMotion: ReduceMotion.System });
          onPressIn?.(event);
        }}
        onPressOut={event => {
          if (!reduced && !disabled) scale.value = withSpring(1, {
            stiffness: 260, damping: 16, mass: 0.6, reduceMotion: ReduceMotion.System,
          });
          else scale.value = 1;
          onPressOut?.(event);
        }}
      />
    </Animated.View>
  );
}
