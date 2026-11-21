import type { ComponentProps, ComponentRef } from 'react';
import type { View } from 'react-native';
import type Animated from 'react-native-reanimated';
import type { FrameMotion } from '../utils/frame-timing';

// The element a View draws: on the web, its DOM element.
export type ViewElement = ComponentRef<typeof View>;

// Where a Frame part sits along the window, and whether it shows there.
export type OffsetMotion = FrameMotion & {
  offset: number;
  visible: boolean;
};

// What the moving view spreads: the web also takes its element, to play the motion on it.
export interface FrameSlide {
  ref?: (node: ViewElement | null) => void;
  style: ComponentProps<typeof Animated.View>['style'];
}
