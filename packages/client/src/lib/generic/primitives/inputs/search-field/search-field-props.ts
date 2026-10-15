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

// The open search fills the native app bar's own slots: Back in the navigation icon's, the field in the title's, Clear last.
export interface AppBarSearch {
  open: boolean;
  openSearch: () => void;
  // Clears the query and gives the bar back.
  close: () => void;
  // The focused field, for the title's place; null while closed.
  field: ReactElement | null;
  // Empties the field; set while the open search has text.
  clear?: () => void;
}
