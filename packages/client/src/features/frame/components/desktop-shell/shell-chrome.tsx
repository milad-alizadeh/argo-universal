import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';

// An invisible strip along the window's top drags the Electron window; controls above it stay clickable.
export function WindowDragStrip(): React.JSX.Element {
  return (
    <View
      testID="window-drag-strip"
      pointerEvents="none"
      className="absolute inset-x-0 top-0 h-[calc(var(--spacing-shell-inset)+var(--spacing-shell-control))] web:[app-region:drag]"
    />
  );
}

// Floats over the top of the detail and Inspector, so an expanded Inspector still shows it; touches outside the banner reach the page.
export function PaneBanner({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 top-3 items-center"
    >
      {children}
    </View>
  );
}
