import { useState } from 'react';
import { type SessionsView, useSessionsView } from './sessions-view';

export interface SessionsViewState {
  query: string;
  onQueryChange: (query: string) => void;
  view: SessionsView;
  onViewChange: (view: SessionsView) => void;
}

// The search and the view, its group, status and row layout, that the list header and the list share; the view stays on this Device.
export function useSessionsViewState(): SessionsViewState {
  const [query, setQuery] = useState('');
  const [view, setView] = useSessionsView();

  return {
    query,
    onQueryChange: setQuery,
    view,
    onViewChange: setView,
  };
}
