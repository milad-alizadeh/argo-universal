import type { ScreenHeaderSearch } from './screen-header';

export interface HeaderSearchBarProps {
  search: ScreenHeaderSearch;
  // Open search takes the whole header, so the header hides its other items meanwhile.
  onSearchingChange?: (searching: boolean) => void;
}

// Only Android searches from the title's place; iOS docks its native bar, and the web morphs its icon (HeaderSearchRow).
export function HeaderSearchBar(_props: HeaderSearchBarProps): null {
  return null;
}
