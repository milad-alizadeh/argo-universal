import type * as React from 'react';
import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

// The empty window can still be dragged before a Project gives it a Frame.
export function WindowDragStrip(): React.JSX.Element {
  return (
    <View
      testID="window-drag-strip"
      className="pointer-events-none absolute inset-x-0 top-0 h-frame-control web:[app-region:drag]"
    />
  );
}

// Floats over the top of the detail and Inspector, so an expanded Inspector still shows it; touches outside the banner reach the page.
export interface PaneBannerProps {
  // Where the panes start, when the sidebar beside them is not in the same row.
  left?: number;
  // The span to centre in, when it is narrower than everything right of `left`.
  width?: number;
  children: ReactNode;
}

export function PaneBanner({
  left,
  width,
  children,
}: PaneBannerProps): React.JSX.Element {
  return (
    <View
      className="pointer-events-box-none absolute top-3 items-center"
      style={bannerStyle(left, width)}
    >
      {children}
    </View>
  );
}

// With no width the banner runs to the window's right edge.
const bannerStyle = (left?: number, width?: number): ViewStyle =>
  width === undefined ? { left, right: 0 } : { left, width };
