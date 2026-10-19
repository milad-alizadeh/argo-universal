import type { ReactNode } from 'react';
import type * as React from 'react';
import {
  SettingsLayout,
  type SettingsLayoutProps,
  type SettingsLayoutSections,
} from '#primitives/scaffolds/settings-layout';
import { EmptyState } from '#primitives/status/empty-state';
import { settingsRows } from './settings-pages-data';
import { settingsItem, shownRow } from './settings-pages-items';
import type { SettingsPagesProps, SettingsRow } from './settings-pages-props';

export type { SettingsPagesProps } from './settings-pages-props';

/*
 * Settings: one group of pages, without a heading, narrowed by the search, beside the page shown on a wide window.
 * A phone leaves out Devices and Notifications.
 */
export function SettingsPages(
  props: SettingsPagesProps & { children?: ReactNode },
): React.JSX.Element {
  return (
    <SettingsLayout
      {...settingsLayoutProps(props)}
      empty={<NoMatchingSettings query={props.query} />}
    >
      {props.children}
    </SettingsLayout>
  );
}

const sectionsOf = (rows: SettingsRow[]): SettingsLayoutSections => [
  { items: rows.map(settingsItem) },
];

// Each row's id is its path; a wide window lists every page, so its rows answer selection.
function settingsLayoutProps(
  props: SettingsPagesProps,
): Pick<SettingsLayoutProps, 'sections' | 'selected' | 'onSelect'> {
  const wide = settingsRows(props, true);

  return {
    sections: {
      compact: sectionsOf(settingsRows(props, false)),
      wide: sectionsOf(wide),
    },
    selected: shownRow(wide, props.selectedPath)?.href,
    onSelect: (id) => openRow(wide, id, props.onSelect),
  };
}

function openRow(
  rows: SettingsRow[],
  id: string,
  open: SettingsPagesProps['onSelect'],
): void {
  const row = rows.find(({ href }) => href === id);

  if (row) open(row.href);
}

// A search that finds nothing says so as the Sessions list does.
function NoMatchingSettings({
  query = '',
}: Pick<SettingsPagesProps, 'query'>): React.JSX.Element {
  return (
    <EmptyState
      icon="search"
      title="No matching settings"
      description={`No Settings page has "${query.trim()}" in its name.`}
    />
  );
}
