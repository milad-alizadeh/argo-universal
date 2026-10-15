import type * as React from 'react';
import { createContext, type ReactNode, use, useState } from 'react';
import { type SessionsFilter, useSessionsFilter } from '#features/sessions';

export interface SectionFilters {
  sessions: SessionsFilter;
  settingsQuery: string;
  onSettingsQueryChange: (query: string) => void;
}

const SectionFiltersContext = createContext<SectionFilters | null>(null);

// The Sessions filter and the Settings search, held once for the shell: the wide sidebar's list, a narrow root's list and its header share them, so a width change keeps them.
export function SectionFiltersProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const sessions = useSessionsFilter();
  const [settingsQuery, onSettingsQueryChange] = useState('');

  return (
    <SectionFiltersContext
      value={{ sessions, settingsQuery, onSettingsQueryChange }}
    >
      {children}
    </SectionFiltersContext>
  );
}

export function useSectionFilters(): SectionFilters {
  const filters = use(SectionFiltersContext);

  if (!filters) throw new Error('Render inside a SectionFiltersProvider.');

  return filters;
}
