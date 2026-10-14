import type { ReactElement, ReactNode } from 'react';

export interface SearchQueryProps {
  // Names the search and shows as the placeholder, such as "Search Agents".
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}

// A search button, last in its row, that morphs into a field over the whole row.
export type MorphSearchFieldProps = SearchQueryProps & {
  variant?: 'morph';
  // The row the open field replaces: the title, then other actions. Search always comes last.
  title: ReactNode;
  actions?: ReactNode;
};

// A phone list's search bar at its top. No platform draws it now: iOS searches from its header, Android from its app bar.
export type DockedSearchQuery = SearchQueryProps & {
  // What leads the header above the list, so the bar's text starts where the header's title does.
  leading: 'menu' | 'back';
};

export type DockedSearchFieldProps = DockedSearchQuery & {
  variant: 'docked';
  className?: string;
};

// What the docked bar itself takes once the field has chosen it.
export type DockedSearchBarProps = Omit<DockedSearchFieldProps, 'variant'>;

export type SearchFieldProps = MorphSearchFieldProps | DockedSearchFieldProps;

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
