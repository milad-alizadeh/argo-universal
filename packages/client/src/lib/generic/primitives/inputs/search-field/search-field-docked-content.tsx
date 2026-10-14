import type { ComponentType } from 'react';
import type { DockedSearchQuery } from './search-field-props';

// Only Android docks a search bar at the top of a list, here as Compose content for a list that is itself a Compose view.
export function DockedSearchFieldContent(_: DockedSearchQuery): null {
  return null;
}

DockedSearchFieldContent satisfies ComponentType<DockedSearchQuery>;
