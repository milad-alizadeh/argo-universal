import {
  SettingsPages,
  type SettingsLayoutSections,
  type SettingsPagesProps,
} from '@repo/kit/primitives/scaffolds/settings-layout';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type { ReactNode } from 'react';
import type * as React from 'react';
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
 * narrowed by the search. The Frame places the list, beside the page shown on a wide window. A phone leaves out
 * Devices and Notifications.
 */
export function SettingsListView(
  props: SettingsListViewProps,
): React.JSX.Element {
  return (
    <SettingsPages
      {...settingsPagesProps(props)}
      lastSection={shownTheme(props)}
      empty={<NoMatchingSettings query={props.query} />}
    />
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
function settingsPagesProps(
  props: SettingsListViewProps,
): Pick<SettingsPagesProps, 'sections' | 'selected' | 'onSelect'> {
  const everyPage = sectionsOf(settingsGroups(props, true));

  return {
    /*
     * Only a phone leaves out Devices and Notifications, and a phone is always compact. A tablet in portrait is medium,
     * and it keeps both, as it does in landscape: medium takes the wide list (#1705; the 600 to 1099 range is #927).
     */
    sections: {
      compact: sectionsOf(settingsGroups(props, false)),
      medium: everyPage,
      wide: everyPage,
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
