import type * as React from 'react';
import type { DockedSearchBarProps } from './search-field-props';

// Only Android docks a search bar at the top of a list; iOS's sits in its header, and a wide window's in the title row.
export function DockedSearchField(_: DockedSearchBarProps): null {
  return null;
}

DockedSearchField satisfies React.ComponentType<DockedSearchBarProps>;
