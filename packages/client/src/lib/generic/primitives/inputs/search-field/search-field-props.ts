import type { ReactElement, ReactNode } from 'react';

export interface SearchQueryProps {
  // Names the search and shows as the placeholder, such as "Search Agents".
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}

// A search button, last in its row, that morphs into a field over the whole row.
export type SearchFieldProps = SearchQueryProps & {
  // The row the open field replaces: the title, then other actions. Search always comes last.
  title: ReactNode;
  actions?: ReactNode;
};

// The search an app bar opens: its label names it and is the open field's placeholder.
export type AppBarSearchQuery = Pick<
  SearchQueryProps,
  'label' | 'onChangeText'
>;

export interface AppBarSearch {
  open: boolean;
  openSearch: () => void;
  // The open search, drawn in the app bar's place; null while closed.
  bar: ReactElement | null;
}
