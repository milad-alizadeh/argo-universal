import type { ReactNode } from 'react';
import type { FramePaneProps } from '../components/frame-pane/frame-pane';
import type { FrameMotion } from '../utils/frame-timing';

/*
 * The Inspector's glass, from the overlay's top-left corner: the open panel, which runs to the inset above the
 * window's bottom, or the closed Inspector's capsule. `height` is null for the panel.
 */
export interface InspectorBox {
  x: number;
  y: number;
  width: number;
  height: number | null;
  bottom: number;
  opacity: number;
}

export interface InspectorGlassProps extends FrameMotion {
  box: InspectorBox;
  children: ReactNode;
}

// A tablet's Inspector pane draws its own system glass, and its capsule draws its own.
export const inspectorSurface: FramePaneProps['surface'] = 'glass';

export function InspectorGlass({ children }: InspectorGlassProps): ReactNode {
  return children;
}
