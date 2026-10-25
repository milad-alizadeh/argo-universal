import { SearchField } from '@repo/kit/primitives/controls/search-field';
import { usePathname } from 'expo-router';
import type * as React from 'react';
import { useState } from 'react';
import { Platform } from 'react-native';
import type { SectionList, SectionLists } from '#features/frame';
import {
  type SessionsViewState,
  SessionsHeader,
  useSessionsViewState,
} from '#features/sessions';
import { ListTitle } from '#lib/product/list-title';
import {
  type FirstPage,
  newSessionHref,
  useNavigate,
} from '#lib/product/navigation/navigation';
import { newSessionId } from '../lib/product/navigation/new-session';
import { sections } from '../lib/product/navigation/sections';
import { LiveSessionList } from './sessions/live-session-list';
import { SessionsRootScreen } from './sessions/sessions-root-screen';
import {
  searchSettings,
  SettingsRootScreen,
} from './settings/settings-section';

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
    rootPage: <SessionsRootScreen {...root}>{list}</SessionsRootScreen>,
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

const settingsFirstPage: FirstPage = { page: 'accounts/index' };

// `/settings`: the Settings pages the search narrows, which Settings' SettingsLayout draws; with the list beside the pages, the root opens Accounts.
function settingsList({ query, onQueryChange }: SettingsQuery): SectionList {
  return {
    header: <SettingsSearch query={query} onQueryChange={onQueryChange} />,
    list: null,
    query,
    rootPage: (
      <SettingsRootScreen query={query} onQueryChange={onQueryChange} />
    ),
    useFirstPage: () => settingsFirstPage,
  };
}

/*
 * Each section's list, its header and its root page, with the Sessions view and the
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
