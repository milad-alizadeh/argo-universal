import type * as React from 'react';
import type { DockedSearchBarProps } from './search-field-props';

// No list docks a search bar: iOS searches from its header, Android from its app bar, a wide window from its title row.
export function DockedSearchField(_: DockedSearchBarProps): null {
  return null;
}

DockedSearchField satisfies React.ComponentType<DockedSearchBarProps>;
