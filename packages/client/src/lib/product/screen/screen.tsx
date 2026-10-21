import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  type Edge,
  type EdgeInsets,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const allEdges: readonly Edge[] = ['top', 'right', 'bottom', 'left'];

const keyboardAvoidingStyle = { flex: 1, minHeight: 0 };

// What the content keeps above the open keyboard, as it keeps from the screen's sides.
const keyboardGap = 16;

/*
 * How much of the content the open keyboard covers: its own height, less the bottom inset the Screen
 * around it already holds clear, and the gap once it is up. KeyboardAvoidingView works this out from
 * where the view sits in the window, which it reads asynchronously and, when that read does not land,
 * falls back to where the view sits in its parent — on New Session that left the Composer a native
 * header's height under the keyboard. The keyboard's own height is the same measure from either end
 * of the screen, so nothing has to be located to use it (owner, 2026-10-20).
 */
function keyboardSpace(
  keyboard: number,
  inset: number,
  progress: number,
): number {
  'worklet';

  return Math.max(-keyboard - inset, 0) + keyboardGap * progress;
}

interface KeyboardAvoidingContentProps {
  children: ReactNode;
  // The bottom safe area the Screen around this content already holds clear, which the keyboard takes over.
  inset?: number;
}

function useKeyboardSpace(
  inset: number,
): ReturnType<typeof useAnimatedStyle<ViewStyle>> {
  const { height, progress } = useReanimatedKeyboardAnimation();

  return useAnimatedStyle(
    () => ({
      paddingBottom: keyboardSpace(height.get(), inset, progress.get()),
    }),
    [inset],
  );
}

// A screen's content, following the keyboard frame by frame on both phones.
export function KeyboardAvoidingContent(
  props: KeyboardAvoidingContentProps,
): React.JSX.Element {
  const space = useKeyboardSpace(props.inset ?? 0);

  return (
    <Animated.View style={[keyboardAvoidingStyle, space]}>
      {props.children}
    </Animated.View>
  );
}

export interface ScreenProps extends ViewProps {
  safeArea?: boolean;
  edges?: readonly Edge[];
}

export function Screen(screenProps: ScreenProps): React.JSX.Element {
  const { safeArea, edges, style, ...props } = screenProps;
  const padding = useSafeAreaPadding({ safeArea, edges });

  return (
    <View
      {...props}
      className={cn('flex-1 bg-content', props.className)}
      style={[{ minHeight: 0 }, padding, style]}
    >
      <View className="relative flex-1" style={{ minHeight: 0 }}>
        {props.children}
      </View>
    </View>
  );
}

function useSafeAreaPadding({
  safeArea,
  edges = allEdges,
}: Pick<ScreenProps, 'safeArea' | 'edges'>): ViewStyle | false {
  const insets = useSafeAreaInsets();

  return safeArea !== false && edgePadding(insets, edges);
}

function edgePadding(insets: EdgeInsets, edges: readonly Edge[]): ViewStyle {
  const inset = (edge: Edge): number =>
    edges.includes(edge) ? insets[edge] : 0;

  return {
    paddingTop: inset('top'),
    paddingRight: inset('right'),
    paddingBottom: inset('bottom'),
    paddingLeft: inset('left'),
  };
}
