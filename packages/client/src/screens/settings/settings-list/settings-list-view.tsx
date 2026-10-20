import type { ReactNode } from 'react';
import type * as React from 'react';
import {
  SettingsLayout,
  type SettingsLayoutProps,
  type SettingsLayoutSections,
} from '#primitives/scaffolds/settings-layout';
import { EmptyState } from '#primitives/status/empty-state';
import {
  matchesSearch,
  settingsGroups,
  settingsRows,
} from './settings-list-data';
import { settingsItem, shownRow } from './settings-list-items';
import type {
  SettingsGroup,
  SettingsListViewProps,
} from './settings-list-props';
import { themeSection } from './settings-list-theme';

export type { SettingsListViewProps } from './settings-list-props';

/*
 * Settings: the pages in Workspace, Account and Connection groups, then Theme, whose Appearance row chooses in place;
 * narrowed by the search, beside the page shown on a wide window. A phone leaves out Devices and Notifications.
 */
export function SettingsListView(
  props: SettingsListViewProps & { children?: ReactNode },
): React.JSX.Element {
  return (
    <SettingsLayout
      {...settingsLayoutProps(props)}
      pinned={shownTheme(props)}
      empty={<NoMatchingSettings query={props.query} />}
    >
      {props.children}
    </SettingsLayout>
  );
}

// The Theme group, unless the search leaves out its one row.
const shownTheme = (props: SettingsListViewProps): ReactNode =>
  matchesSearch('Appearance', props.query) ? themeSection(props) : undefined;

const sectionsOf = (groups: SettingsGroup[]): SettingsLayoutSections =>
  groups.map((group) => ({
    title: group.title,
    items: group.rows.map(settingsItem),
  }));

// Each row's id is its path, which onSelect opens; a wide window lists every page, so its rows answer selection.
function settingsLayoutProps(
  props: SettingsListViewProps,
): Pick<SettingsLayoutProps, 'sections' | 'selected' | 'onSelect'> {
  return {
    sections: {
      compact: sectionsOf(settingsGroups(props, false)),
      wide: sectionsOf(settingsGroups(props, true)),
    },
    selected: shownRow(settingsRows(props, true), props.selectedPath)?.href,
    onSelect: selectPage(props),
  };
}

// A search that finds nothing says so as the Sessions list does.
function NoMatchingSettings({
  query = '',
}: Pick<SettingsListViewProps, 'query'>): React.JSX.Element {
  return (
    <EmptyState
      icon="search"
      title="No matching settings"
      description={`No Settings page has "${query.trim()}" in its name.`}
    />
  );
}

// The kit reports a string; only a page from this Settings list can be opened.
const selectPage =
  (props: SettingsListViewProps) =>
  (href: string): void => {
    const row = settingsRows(props, true).find((item) => item.href === href);

    if (row) props.onSelect(row.href);
  };
