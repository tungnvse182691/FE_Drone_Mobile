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

export interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  pressedScale?: number;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
}

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

export const AnimatedPressable = forwardRef<View, AnimatedPressableProps>(
  (
    {
      pressedScale = 0.98,
      style,
      onPressIn,
      onPressOut,
      children,
      ...rest
    },
    ref,
  ) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const reducedMotion = useReducedMotion();

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    const handlePressIn = (e: GestureResponderEvent) => {
      if (!reducedMotion) {
        scale.value = withTiming(pressedScale ?? 0.98, { duration: 150 });
        opacity.value = withTiming(0.95, { duration: 150 });
      }
      onPressIn?.(e);
    };

    const handlePressOut = (e: GestureResponderEvent) => {
      if (!reducedMotion) {
        scale.value = withTiming(1, { duration: 150 });
        opacity.value = withTiming(1, { duration: 150 });
      }
      onPressOut?.(e);
    };

    const resolvedStyle =
      typeof style === 'function'
        ? (state: PressableStateCallbackType) => [style(state), animatedStyle]
        : [style, animatedStyle];

    return (
      <AnimatedPressableComponent
        ref={ref}
        style={resolvedStyle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...rest}
      >
        {children}
      </AnimatedPressableComponent>
    );
  },
);

AnimatedPressable.displayName = 'AnimatedPressable';
