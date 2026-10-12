import type { ScreenHeaderSearch } from './screen-header';

export interface DockedSearchProps {
  search: ScreenHeaderSearch;
  // What leads the header above, so the search text lines up with its title.
  leading: 'menu' | 'back';
}

// Only Android docks a search bar under the header.
export function DockedSearch(_: DockedSearchProps): null {
  return null;
}
