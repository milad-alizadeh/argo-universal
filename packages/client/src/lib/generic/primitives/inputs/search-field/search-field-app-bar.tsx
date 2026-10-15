import type { AppBarSearch, AppBarSearchQuery } from './search-field-props';

const closed: AppBarSearch = { open: false, openSearch: () => {}, bar: null };

// Only Android opens search in the app bar's place; iOS's header and the web's title row search on their own.
export function useAppBarSearch(
  _: AppBarSearchQuery | undefined,
): AppBarSearch {
  return closed;
}
