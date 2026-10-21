import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';

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
      className="pointer-events-box-none absolute inset-x-0 top-3 items-center"
      style={{ left }}
    >
      {children}
    </View>
  );
}
