import type { ScreenHeaderSearch } from './screen-header';

// Only Android docks a search bar under the header.
export function DockedSearch(_: { search: ScreenHeaderSearch }): null {
  return null;
}
