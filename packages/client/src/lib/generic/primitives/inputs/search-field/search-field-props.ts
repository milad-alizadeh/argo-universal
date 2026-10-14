import type { ReactNode } from 'react';

export interface SearchQueryProps {
  // Names the search and shows as the placeholder, such as "Search Agents".
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}

// A search button, last in its row, that morphs into a field over the whole row.
export type MorphSearchFieldProps = SearchQueryProps & {
  appearance?: 'morph';
  // The row the open field replaces: the title, then other actions. Search always comes last.
  title: ReactNode;
  actions?: ReactNode;
};

// A phone list's search docked at its top, scrolling with it.
export type DockedSearchQuery = SearchQueryProps & {
  // What leads the header above the list, so the bar's text starts where the header's title does.
  leading: 'menu' | 'back';
};

export type DockedSearchFieldProps = DockedSearchQuery & {
  appearance: 'docked';
  className?: string;
};

// What the docked bar itself takes once the field has chosen it.
export type DockedSearchBarProps = Omit<DockedSearchFieldProps, 'appearance'>;

export type SearchFieldProps = MorphSearchFieldProps | DockedSearchFieldProps;
