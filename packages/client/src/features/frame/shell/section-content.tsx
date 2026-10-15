import type * as React from 'react';
import { createContext, type ReactNode, use, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  type SessionsFilter,
  SessionsHeader,
  sessionsHeaderItems,
  sessionsHeaderSearch,
  useSessionsFilter,
} from '#features/sessions';
import { ListTitle } from '#lib/product/list-title';
import {
  newSessionHref,
  newSessionId,
  useNavigate,
} from '#lib/product/navigation/navigation';
import type { ScreenHeaderProps } from '#lib/product/navigation/screen-header';
import { Text } from '#primitives/display/text';
import { SearchField } from '#primitives/inputs/search-field';
import {
  type Section,
  sections,
} from '../../../lib/product/navigation/sections';
import { LiveSessionList } from '../../../screens/sessions/live-session-list';
import { SettingsNavigationList } from '../../../screens/settings/settings-navigation-list';

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

export type SectionRootHeaders = Record<Section, ScreenHeaderProps>;

const searchSettings = 'Search Settings';

const settingsRootHeader = (
  onChangeText: (query: string) => void,
): ScreenHeaderProps => ({
  title: sections.settings.title,
  search: { placeholder: searchSettings, onChangeText },
});

// What each section root's narrow header shows: the title, its trailing items and its search, wired to the shell's filters.
export const sectionRootHeaders = (
  { sessions, onSettingsQueryChange }: SectionFilters,
  onNewSession: () => void,
): SectionRootHeaders => ({
  sessions: {
    title: sections.sessions.title,
    right: sessionsHeaderItems(sessions),
    search: sessionsHeaderSearch(sessions, onNewSession),
  },
  issues: { title: sections.issues.title },
  atlas: { title: sections.atlas.title },
  settings: settingsRootHeader(onSettingsQueryChange),
});

export function useSectionRootHeaders(): SectionRootHeaders {
  const navigate = useNavigate();

  return sectionRootHeaders(useSectionFilters(), () =>
    navigate(newSessionHref()),
  );
}

export interface SectionContent {
  // The list's own part of the wide window's header row.
  header: ReactNode;
  list: ReactNode;
}

// The Session a path shows, which the wide sidebar marks; New Session is none.
function shownSessionId(path: string): string | undefined {
  const [section, id] = path.split('/').filter(Boolean);

  return section === 'sessions' && id !== newSessionId ? id : undefined;
}

function sessionsContent(
  { sessions }: SectionFilters,
  path: string,
  onNewSession: () => void,
): SectionContent {
  return {
    header: <SessionsHeader {...sessions} onNewSession={onNewSession} />,
    list: (
      <LiveSessionList {...sessions} selectedSessionId={shownSessionId(path)} />
    ),
  };
}

function SettingsSearch(filters: SectionFilters): React.JSX.Element {
  return (
    <SearchField
      label={searchSettings}
      value={filters.settingsQuery}
      onChangeText={filters.onSettingsQueryChange}
      title={<ListTitle>{sections.settings.title}</ListTitle>}
    />
  );
}

function settingsContent(
  filters: SectionFilters,
  path: string,
): SectionContent {
  return {
    header: <SettingsSearch {...filters} />,
    list: (
      <SettingsNavigationList
        selectedPath={path}
        query={filters.settingsQuery}
      />
    ),
  };
}

// A placeholder until the section's list screen is built; insets itself below a transparent header.
function PlaceholderList({ section }: { section: Section }): React.JSX.Element {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-gutter py-6"
    >
      <Text role="secondary">
        {sections[section].title} list will appear here.
      </Text>
    </ScrollView>
  );
}

// The shown section's list and its header row, in the wide window's sidebar.
export function useSectionContent(
  section: Section,
  path: string,
): SectionContent {
  const filters = useSectionFilters();
  const navigate = useNavigate();

  if (section === 'sessions')
    return sessionsContent(filters, path, () => navigate(newSessionHref()));

  if (section === 'settings') return settingsContent(filters, path);

  return {
    header: <ListTitle>{sections[section].title}</ListTitle>,
    list: <PlaceholderList section={section} />,
  };
}
