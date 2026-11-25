import type { ReactNode } from 'react';
import type { FrameMotion } from '../utils/frame-timing';

export interface WorkbenchClipProps extends FrameMotion {
  // The Inspector glass's leading edge, from the overlay's left edge.
  edge: number;
  // Whether the Inspector is open, which holds the Workbench left of its edge at rest.
  inspectorOpen: boolean;
  children: ReactNode;
}

// The native Workbench draws without a clip.
export function WorkbenchClip({ children }: WorkbenchClipProps): ReactNode {
  return children;
}
