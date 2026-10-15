import type { ReactNode } from 'react';
import type { DockedSearchQuery } from '#primitives/inputs/search-field';

export interface GroupedListProps {
  children: ReactNode;
  // A wide window's flat sidebar; phones always draw the grouped list.
  variant?: 'grouped' | 'sidebar';
  // A content-sized overlay uses compact groups rather than a full screen's scrolling column.
  fit?: boolean;
  // A phone's search above the sections; only Android draws it, as iOS searches from its header.
  search?: DockedSearchQuery;
}
