import type * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { type Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '#lib/utils';

const allEdges: readonly Edge[] = ['top', 'right', 'bottom', 'left'];

// The KeyboardAvoidingView's style: it follows the keyboard frame by frame on both phones; `automaticOffset` measures the view on screen, below any header.
export const keyboardAvoidingStyle = { flex: 1, minHeight: 0 };

export interface ScreenProps extends ViewProps {
  safeArea?: boolean;
  edges?: readonly Edge[];
}

export function Screen({
  safeArea = true,
  edges = allEdges,
  className,
  style,
  children,
  ...props
}: ScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <View
      {...props}
      className={cn('flex-1 bg-background', className)}
      style={[
        { minHeight: 0 },
        safeArea && {
          paddingTop: edges.includes('top') ? insets.top : 0,
          paddingRight: edges.includes('right') ? insets.right : 0,
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
          paddingLeft: edges.includes('left') ? insets.left : 0,
        },
        style,
      ]}
    >
      <View className="relative flex-1" style={{ minHeight: 0 }}>
        {children}
      </View>
    </View>
  );
}
