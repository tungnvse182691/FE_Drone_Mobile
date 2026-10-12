import React, { forwardRef } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedComponent = Animated.createAnimatedComponent(Pressable);

export interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  pressedScale?: number;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
}

export const AnimatedPressable = forwardRef<View, AnimatedPressableProps>(
  (
    {
      pressedScale = 0.98,
      style,
      onPressIn,
      onPressOut,
      disabled,
      ...restProps
    },
    ref,
  ) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const shouldReduceMotion = useReducedMotion();

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    const handlePressIn = (event: GestureResponderEvent) => {
      if (!disabled) {
        if (shouldReduceMotion) {
          scale.value = 1;
          opacity.value = 1;
        } else {
          scale.value = withTiming(pressedScale, { duration: 150 });
          opacity.value = withTiming(0.95, { duration: 150 });
        }
      }
      onPressIn?.(event);
    };

    const handlePressOut = (event: GestureResponderEvent) => {
      if (!disabled) {
        if (shouldReduceMotion) {
          scale.value = 1;
          opacity.value = 1;
        } else {
          scale.value = withTiming(1, { duration: 150 });
          opacity.value = withTiming(1, { duration: 150 });
        }
      }
      onPressOut?.(event);
    };

    return (
      <AnimatedComponent
        ref={ref}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={(state: PressableStateCallbackType) => {
          const resolvedStyle = typeof style === 'function' ? style(state) : style;
          return [resolvedStyle, animatedStyle];
        }}
        {...restProps}
      />
    );
  },
);

AnimatedPressable.displayName = 'AnimatedPressable';
