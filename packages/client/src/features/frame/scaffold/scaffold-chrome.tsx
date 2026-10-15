import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';

// An invisible strip along the window's top drags the Electron window; controls above it stay clickable.
export function WindowDragStrip(): React.JSX.Element {
  return (
    <View
      testID="window-drag-strip"
      pointerEvents="none"
      className="absolute inset-x-0 top-0 h-[calc(var(--spacing-frame-inset)+var(--spacing-frame-control))] web:[app-region:drag]"
    />
  );
}

// Floats over the top of the detail and Inspector, so an expanded Inspector still shows it; touches outside the banner reach the page.
interface PaneBannerProps {
  // Where the panes start, when the sidebar beside them is not in the same row.
  left?: number;
  children: ReactNode;
}

export function PaneBanner({
  left,
  children,
}: PaneBannerProps): React.JSX.Element {
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 top-3 items-center"
      style={{ left }}
    >
      {children}
    </View>
  );
}
