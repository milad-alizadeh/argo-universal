import type { ReactNode } from 'react';

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
