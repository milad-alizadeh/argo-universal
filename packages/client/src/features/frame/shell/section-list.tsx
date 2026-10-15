import type * as React from 'react';
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { type SessionsFilter, SessionsHeader } from '#features/sessions';
import { ListTitle } from '#lib/product/list-title';
import {
  type NavigationDestination,
  useNavigate,
} from '#lib/product/navigation/context';
import { Text } from '#primitives/display/text';
import { SearchField } from '#primitives/inputs/search-field';
import type { Section } from '../../../lib/product/navigation/sections';
import { LiveSessionList } from '../../../screens/sessions/live-session-list';
import { SettingsNavigationList } from '../../../screens/settings/settings-navigation-list';
import { shellSections } from '../components/shell-sections';
import { type SectionFilters, useSectionFilters } from './section-filters';

export interface SectionList {
  // The list's own part of the wide window's header row, when it has one.
  header?: ReactNode;
  list: ReactNode;
}

function openSessionId(
  destination: NavigationDestination | undefined,
): string | undefined {
  return destination?.to === 'session' ? destination.id : undefined;
}

interface SessionsListSource {
  sessionsFilter: SessionsFilter;
  navigate: ReturnType<typeof useNavigate>;
  selectedDestination?: NavigationDestination;
}

function sessionsScreen(
  sessionsFilter: SessionsFilter,
  selectedDestination?: NavigationDestination,
): React.JSX.Element {
  return (
    <LiveSessionList
      query={sessionsFilter.query}
      onQueryChange={sessionsFilter.onQueryChange}
      archived={sessionsFilter.archived}
      selectedSessionId={openSessionId(selectedDestination)}
    />
  );
}

function sessionsList({
  sessionsFilter,
  navigate,
  selectedDestination,
}: SessionsListSource): SectionList {
  const newSession = (): void => navigate({ to: 'new-session' });

  return {
    header: <SessionsHeader {...sessionsFilter} onNewSession={newSession} />,
    list: sessionsScreen(sessionsFilter, selectedDestination),
  };
}

function settingsSearchField({
  settingsQuery,
  onSettingsQueryChange,
}: SectionFilters): React.JSX.Element {
  return (
    <SearchField
      label="Search Settings"
      value={settingsQuery}
      onChangeText={onSettingsQueryChange}
      title={<ListTitle>Settings</ListTitle>}
    />
  );
}

function settingsList(
  filters: SectionFilters,
  selectedDestination?: NavigationDestination,
): SectionList {
  return {
    header: settingsSearchField(filters),
    list: (
      <SettingsNavigationList
        selectedDestination={selectedDestination}
        query={filters.settingsQuery}
      />
    ),
  };
}

// A placeholder until the section's list screen is built; insets itself below a transparent header.
function PlaceholderList({ section }: { section: Section }): React.JSX.Element {
  const { title } = shellSections[section];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-gutter py-6"
    >
      <Text role="secondary">{title} list will appear here.</Text>
    </ScrollView>
  );
}

// A section's list and its header row: full screen on a phone, and in the sidebar on a wide window.
export function useSectionList(
  section: Section,
  selectedDestination?: NavigationDestination,
): SectionList {
  const filters = useSectionFilters();
  const navigate = useNavigate();

  if (section === 'sessions')
    return sessionsList({
      sessionsFilter: filters.sessions,
      navigate,
      selectedDestination,
    });

  if (section === 'settings') return settingsList(filters, selectedDestination);

  return { list: <PlaceholderList section={section} /> };
}
