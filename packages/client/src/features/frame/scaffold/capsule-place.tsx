import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import type { WindowBox } from './band-geometry';

export interface BandCapsuleProps {
  // The pill in the title bar's row, from the row's top-left corner.
  box: WindowBox;
  // Which panel's capsule: the sidebar's or the Inspector's.
  side: 'leading' | 'trailing';
}

// Where the pill stands, which the title bar keeps on every platform for tests and assistive tools to find.
export function CapsulePlace({
  box,
  side,
  children,
}: BandCapsuleProps & { children?: ReactNode }): ReactElement {
  return (
    <View
      testID={`window-band-${side}-capsule`}
      aria-hidden
      pointerEvents="none"
      className="absolute"
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
    >
      {children}
    </View>
  );
}
