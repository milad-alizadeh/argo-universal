import { usePathname } from 'expo-router';
import type * as React from 'react';
import { useState } from 'react';
import type { SectionList, SectionLists } from '#features/frame';
import {
  type SessionsViewState,
  useSessionsViewState,
} from '#features/sessions';
import {
  type FirstPage,
  newSessionHref,
  useNavigate,
} from '#lib/product/navigation/navigation';
import { newSessionId } from '../lib/product/navigation/new-session';
import { LiveSessionList } from './sessions/live-session-list';
import { SessionsRootScreen } from './sessions/sessions-root-screen';
import {
  SettingsListScreen,
  type SettingsListScreenProps,
} from './settings/settings-list-screen';

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
  const list = (
    <SessionsRootScreen {...sessions} onNewSession={onNewSession}>
      {sessionsListBody(sessions, path)}
    </SessionsRootScreen>
  );

  return { list, emptyPage: noSessionShown };
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

const settingsFirstPage: FirstPage = { page: 'accounts/index' };

// `/settings`: the Settings pages the search narrows; with the list beside the pages, the root opens Accounts.
function settingsList(search: SettingsListScreenProps): SectionList {
  return {
    list: <SettingsListScreen {...search} />,
    useFirstPage: () => settingsFirstPage,
  };
}

/*
 * Each section's list under its Screen, which declares the header, with the Sessions view and the Settings search held
 * once for the Frame: the sidebar's list and a narrow root's list are the same element, so a width change keeps them.
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
