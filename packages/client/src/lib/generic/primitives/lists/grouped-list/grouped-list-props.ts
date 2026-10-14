import type { ReactNode } from 'react';
import type { DockedSearchQuery } from '#primitives/inputs/search-field';

export interface GroupedListProps {
  children: ReactNode;
  variant?: 'grouped' | 'sidebar';
  // A content-sized overlay uses compact groups rather than a full screen's scrolling column.
  fit?: boolean;
  // A phone's search above the sections, scrolling with them; only Android draws it, as iOS searches from its header.
  search?: DockedSearchQuery;
  // The height of the sections, so a native sheet can fit them; only Android reports it.
  onContentHeightChange?: (height: number) => void;
}
