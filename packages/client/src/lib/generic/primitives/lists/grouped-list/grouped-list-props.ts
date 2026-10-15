import type { ReactNode } from 'react';

export interface GroupedListProps {
  children: ReactNode;
  variant?: 'grouped' | 'sidebar';
  // A content-sized overlay uses compact groups rather than a full screen's scrolling column.
  fit?: boolean;
  // The height of the sections, so a native sheet can fit them; only Android reports it.
  onContentHeightChange?: (height: number) => void;
}
