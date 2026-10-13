import type * as React from 'react';
import type { ReactNode } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
  type Edge,
  type EdgeInsets,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { cn } from '#lib/generic/utils';

const allEdges: readonly Edge[] = ['top', 'right', 'bottom', 'left'];

// It follows the keyboard frame by frame on both phones; `automaticOffset` measures the view on screen, below any header.
const keyboardAvoidingStyle = { flex: 1, minHeight: 0 };

// A screen's content that rises with the keyboard, keeping 16 above it as it keeps from the screen's sides.
export function KeyboardAvoidingContent(props: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <KeyboardAvoidingView
      behavior="padding"
      automaticOffset
      keyboardVerticalOffset={16}
      style={keyboardAvoidingStyle}
    >
      {props.children}
    </KeyboardAvoidingView>
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
      className={cn('flex-1 bg-sidebar', props.className)}
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
