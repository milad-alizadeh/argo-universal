import { useState } from 'react';
import { type SessionsLayout, useSessionsLayout } from './sessions-layout';

export interface SessionsFilter {
  query: string;
  onQueryChange: (query: string) => void;
  archived: boolean;
  onArchivedChange: (archived: boolean) => void;
  layout: SessionsLayout;
  onLayoutChange: (layout: SessionsLayout) => void;
}

// The search, the Active or Archived filter and the row layout that the list header and the list share; the layout stays on this Device.
export function useSessionsFilter(): SessionsFilter {
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);
  const [layout, setLayout] = useSessionsLayout();

  return {
    query,
    onQueryChange: setQuery,
    archived,
    onArchivedChange: setArchived,
    layout,
    onLayoutChange: setLayout,
  };
}
