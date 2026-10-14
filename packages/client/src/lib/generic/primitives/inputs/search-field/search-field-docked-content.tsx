import type { ComponentType } from 'react';
import type { DockedSearchQuery } from './search-field-props';

// No list docks a search bar; Android searches from its app bar instead.
export function DockedSearchFieldContent(_: DockedSearchQuery): null {
  return null;
}

DockedSearchFieldContent satisfies ComponentType<DockedSearchQuery>;
