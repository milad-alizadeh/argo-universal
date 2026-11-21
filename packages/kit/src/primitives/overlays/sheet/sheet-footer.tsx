import type { ReactElement } from 'react';
import { View, type ViewProps } from 'react-native';

// The footer keeps its own height and takes any space left below the scrolling page.
export function SheetFooter({
  children,
  onLayout,
}: Pick<ViewProps, 'children' | 'onLayout'>): ReactElement | null {
  if (!children) return null;

  return (
    <View className="mt-auto shrink-0" onLayout={onLayout}>
      {children}
    </View>
  );
}
