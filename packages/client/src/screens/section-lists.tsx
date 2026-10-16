import { usePathname } from 'expo-router';
import type * as React from 'react';
import { useState } from 'react';
import type { SectionList, SectionLists } from '#features/frame';
import {
  type SessionsFilter,
  SessionsHeader,
  sessionsHeaderItems,
  sessionsHeaderSearch,
  useSessionsFilter,
} from '#features/sessions';
import { ListTitle } from '#lib/product/list-title';
import {
  type FirstPage,
  newSessionHref,
  useNavigate,
} from '#lib/product/navigation/navigation';
import { PhoneSearchBar } from '#lib/product/navigation/phone-search-bar';
import { SearchField } from '#primitives/inputs/search-field';
import { newSessionId } from '../lib/product/navigation/new-session';
import { sections } from '../lib/product/navigation/sections';
import { LiveSessionList } from './sessions/live-session-list';
import { SessionsRootToolbar } from './sessions/sessions-root-toolbar';
import { useFirstSessionPage } from './sessions/use-first-session-page';
import { SettingsNavigationList } from './settings/settings-navigation-list';

const searchSettings = 'Search Settings';

// The Session a path shows, which the sidebar marks; New Session is none.
function shownSessionId(path: string): string | undefined {
  const [section, id] = path.split('/').filter(Boolean);

  return section === 'sessions' && id !== newSessionId ? id : undefined;
}

// `/sessions`: the Sessions the filter shows; with the list beside the pages, the root opens the first active Session, or New Session when there is none.
function sessionsList(
  sessions: SessionsFilter,
  path: string,
  onNewSession: () => void,
): SectionList {
  return {
    header: <SessionsHeader {...sessions} onNewSession={onNewSession} />,
    list: (
      <LiveSessionList {...sessions} selectedSessionId={shownSessionId(path)} />
    ),
    rootHeader: sessionsRootHeader(sessions),
    rootToolbar: sessionsRootToolbar(sessions, onNewSession),
    useFirstPage: useFirstSessionPage,
  };
}

const sessionsRootHeader = (
  sessions: SessionsFilter,
): SectionList['rootHeader'] => ({
  title: sections.sessions.title,
  right: sessionsHeaderItems(sessions),
  search: sessionsHeaderSearch(sessions),
});

// iOS's stock items for the Sessions root: the filter, New Session and the search bar.
const sessionsRootToolbar = (
  sessions: SessionsFilter,
  onNewSession: () => void,
): React.JSX.Element => (
  <SessionsRootToolbar {...sessions} onNewSession={onNewSession} />
);

// iOS's stock search bar for the Settings root.
const settingsRootToolbar = (
  onQueryChange: (query: string) => void,
): React.JSX.Element => (
  <PhoneSearchBar placeholder={searchSettings} onSearch={onQueryChange} />
);

interface SettingsQuery {
  query: string;
  onQueryChange: (query: string) => void;
}

function SettingsSearch({
  query,
  onQueryChange,
}: SettingsQuery): React.JSX.Element {
  return (
    <SearchField
      label={searchSettings}
      value={query}
      onChangeText={onQueryChange}
      title={<ListTitle>{sections.settings.title}</ListTitle>}
    />
  );
}

const settingsFirstPage: FirstPage = { page: 'accounts' };

// `/settings`: the Settings pages the search narrows; with the list beside the pages, the root opens Accounts.
function settingsList(
  { query, onQueryChange }: SettingsQuery,
  path: string,
): SectionList {
  return {
    header: <SettingsSearch query={query} onQueryChange={onQueryChange} />,
    list: <SettingsNavigationList selectedPath={path} query={query} />,
    rootHeader: {
      title: sections.settings.title,
      search: { placeholder: searchSettings, onChangeText: onQueryChange },
    },
    rootToolbar: settingsRootToolbar(onQueryChange),
    useFirstPage: () => settingsFirstPage,
  };
}

/*
 * Each section's list, its header and its root header, with the Sessions filter and the
 * Settings search held once for the Frame: the sidebar's list, a root page's list and its
 * header share them, so a width change keeps them.
 */
export function useSectionLists(): SectionLists {
  const path = usePathname();
  const navigate = useNavigate();
  const sessions = useSessionsFilter();
  const [query, onQueryChange] = useState('');

  return {
    sessions: sessionsList(sessions, path, () => navigate(newSessionHref())),
    settings: settingsList({ query, onQueryChange }, path),
  };
}
