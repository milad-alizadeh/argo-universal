import { usePathname } from 'expo-router';
import type * as React from 'react';
import { useState } from 'react';
import { Platform } from 'react-native';
import type { SectionList, SectionLists } from '#features/frame';
import {
  type SessionsViewState,
  SessionsHeader,
  useSessionsViewState,
} from '#features/session-list';
import { ListTitle } from '#lib/product/list-title';
import {
  type FirstPage,
  newSessionHref,
  useNavigate,
} from '#lib/product/navigation/navigation';
import { SearchField } from '#primitives/inputs/search-field';
import { newSessionId } from '../lib/product/navigation/new-session';
import { sections } from '../lib/product/navigation/sections';
import { LiveSessionList } from './sessions/live-session-list';
import { SessionsRootPage } from './sessions/sessions-root-page';
import { SettingsRootList } from './settings/settings-section';

const searchSettings = 'Search Settings';

// The Session a path shows, which the sidebar marks; New Session is none.
function shownSessionId(path: string): string | undefined {
  const [section, id] = path.split('/').filter(Boolean);

  return section === 'sessions' && id !== newSessionId ? id : undefined;
}

// `/sessions`: the Sessions the filter shows; with the list beside the pages, the root shows no Session until one is picked.
function sessionsList(
  sessions: SessionsViewState,
  path: string,
  onNewSession: () => void,
): SectionList {
  const list = sessionsListBody(sessions, path);
  const root = { ...sessions, onNewSession };

  return {
    header: <SessionsHeader {...root} />,
    list,
    rootHeader: { title: sections.sessions.title },
    rootPage: <SessionsRootPage {...root}>{list}</SessionsRootPage>,
    emptyPage: noSessionShown,
  };
}

const sessionsListBody = (
  sessions: SessionsViewState,
  path: string,
): React.JSX.Element => (
  <LiveSessionList {...sessions} selectedSessionId={shownSessionId(path)} />
);

const noSessionShown = {
  title: 'Select a Session',
  description: 'Choose a Session from the list.',
};

// Settings searches only on the web and desktop; native Settings has no search, at any size (#927).
const settingsSearches = Platform.OS === 'web';

interface SettingsQuery {
  query: string;
  onQueryChange: (query: string) => void;
}

function SettingsSearch({
  query,
  onQueryChange,
}: SettingsQuery): React.JSX.Element {
  const title = <ListTitle>{sections.settings.title}</ListTitle>;

  if (!settingsSearches) return title;

  return (
    <SearchField
      label={searchSettings}
      value={query}
      onChangeText={onQueryChange}
      title={title}
    />
  );
}

const settingsRootHeader = (
  onQueryChange: (query: string) => void,
): SectionList['rootHeader'] => ({
  title: sections.settings.title,
  ...(settingsSearches && {
    search: { placeholder: searchSettings, onChangeText: onQueryChange },
  }),
});

const settingsFirstPage: FirstPage = { page: 'accounts' };

// `/settings`: the Settings pages the search narrows, which Settings' SettingsLayout draws; with the list beside the pages, the root opens Accounts.
function settingsList({ query, onQueryChange }: SettingsQuery): SectionList {
  return {
    header: <SettingsSearch query={query} onQueryChange={onQueryChange} />,
    list: null,
    query,
    rootHeader: settingsRootHeader(onQueryChange),
    rootPage: <SettingsRootList query={query} />,
    useFirstPage: () => settingsFirstPage,
  };
}

/*
 * Each section's list, its header and its root header, with the Sessions view and the
 * Settings search held once for the Frame: the sidebar's list, a root page's list and its
 * header share them, so a width change keeps them.
 */
export function useSectionLists(): SectionLists {
  const path = usePathname();
  const navigate = useNavigate();
  const sessions = useSessionsViewState();
  const [query, onQueryChange] = useState('');

  return {
    sessions: sessionsList(sessions, path, () => navigate(newSessionHref())),
    settings: settingsList({ query, onQueryChange }),
  };
}
