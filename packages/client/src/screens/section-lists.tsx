import { usePathname } from 'expo-router';
import type * as React from 'react';
import { useState } from 'react';
import { ScrollView } from 'react-native';
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
  newSessionHref,
  OpenFirstPage,
  useNavigate,
} from '#lib/product/navigation/navigation';
import { Text } from '#primitives/display/text';
import { SearchField } from '#primitives/inputs/search-field';
import { newSessionId } from '../lib/product/navigation/new-session';
import { type Section, sections } from '../lib/product/navigation/sections';
import { FirstSessionScreen } from './sessions/first-session-screen';
import { LiveSessionList } from './sessions/live-session-list';
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
    rootHeader: sessionsRootHeader(sessions, onNewSession),
    firstPage: <FirstSessionScreen />,
  };
}

const sessionsRootHeader = (
  sessions: SessionsFilter,
  onNewSession: () => void,
): SectionList['rootHeader'] => ({
  title: sections.sessions.title,
  right: sessionsHeaderItems(sessions),
  search: sessionsHeaderSearch(sessions, onNewSession),
});

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
    firstPage: <OpenFirstPage page="accounts" />,
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

// A section whose root is its own page until its list is built.
const placeholderList = (section: Section): SectionList => ({
  header: <ListTitle>{sections[section].title}</ListTitle>,
  list: <PlaceholderList section={section} />,
  rootHeader: { title: sections[section].title },
});

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
    issues: placeholderList('issues'),
    atlas: placeholderList('atlas'),
    settings: settingsList({ query, onQueryChange }, path),
  };
}
