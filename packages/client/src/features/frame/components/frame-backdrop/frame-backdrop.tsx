import type * as React from 'react';
import type { FrameMotion } from '../../utils/frame-timing';

export interface FrameBackdropProps extends FrameMotion {
  sidebarShown: boolean;
}

// The warm glow behind the glass sidebar is drawn on the web only; native glass sits on the plain window surface.
export function FrameBackdrop(
  _props: FrameBackdropProps,
): React.JSX.Element | null {
  return null;
}
