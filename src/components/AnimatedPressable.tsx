import React, { forwardRef, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';

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
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
      AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
      const subscription = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        setReducedMotion,
      );
      return () => {
        subscription?.remove();
      };
    }, []);

    const handlePressIn = (event: GestureResponderEvent) => {
      if (!disabled) {
        if (reducedMotion) {
          scale.setValue(1);
          opacity.setValue(1);
        } else {
          Animated.parallel([
            Animated.timing(scale, {
              toValue: pressedScale,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.95,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }
      onPressIn?.(event);
    };

    const handlePressOut = (event: GestureResponderEvent) => {
      if (!disabled) {
        if (reducedMotion) {
          scale.setValue(1);
          opacity.setValue(1);
        } else {
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }
      onPressOut?.(event);
    };

    const animatedStyle = {
      transform: [{ scale }],
      opacity,
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
