import type * as React from 'react';

export interface FrameBackdropProps {
  sidebarShown: boolean;
  transitionKey: string;
  animate: boolean;
}

// The warm glow behind the glass sidebar is drawn on the web only; native glass sits on the plain window surface.
export function FrameBackdrop(
  _props: FrameBackdropProps,
): React.JSX.Element | null {
  return null;
}
