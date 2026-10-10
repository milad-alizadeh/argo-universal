import { useState } from 'react';

export interface SessionsFilter {
  query: string;
  onQueryChange: (query: string) => void;
  archived: boolean;
  onArchivedChange: (archived: boolean) => void;
}

// The search and Active or Archived filter that the list header and the list share.
export function useSessionsFilter(): SessionsFilter {
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);
  return {
    query,
    onQueryChange: setQuery,
    archived,
    onArchivedChange: setArchived,
  };
}
