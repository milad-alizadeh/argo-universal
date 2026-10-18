import type * as React from 'react';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { EmptyState } from '#primitives/status/empty-state';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import { settingsRows } from './settings-list-data';
import type { SettingsListProps } from './settings-list-props';
import { SettingsRowItem } from './settings-list-rows';

export type { SettingsListProps } from './settings-list-props';

// One list of the pages, without group headings, narrowed by the search: a grouped card on a phone, the sidebar in a wide window.
export function SettingsList(props: SettingsListProps): React.JSX.Element {
  return (
    <SizeClass
      compact={<SettingsRows {...props} sidebar={false} />}
      wide={<SettingsRows {...props} sidebar />}
    />
  );
}

type SettingsRowsProps = SettingsListProps & { sidebar: boolean };

function SettingsRows(props: SettingsRowsProps): React.JSX.Element {
  const rows = settingsRows(props, props.sidebar);

  if (rows.length === 0) return <NoMatchingSettings query={props.query} />;

  return (
    <GroupedList variant={props.sidebar ? 'sidebar' : 'grouped'}>
      <GroupedListSection>{rowItems(rows, props)}</GroupedListSection>
    </GroupedList>
  );
}

const rowItems = (
  rows: ReturnType<typeof settingsRows>,
  props: SettingsRowsProps,
): React.JSX.Element[] =>
  rows.map((row) => (
    <SettingsRowItem
      key={row.label}
      row={row}
      selectable={props.sidebar}
      {...selectionOf(props)}
    />
  ));

const selectionOf = ({
  selectedPath,
  onSelect,
}: SettingsListProps): Pick<
  SettingsListProps,
  'selectedPath' | 'onSelect'
> => ({
  selectedPath,
  onSelect,
});

// A search that finds nothing says so as the Sessions list does.
function NoMatchingSettings({
  query = '',
}: Pick<SettingsListProps, 'query'>): React.JSX.Element {
  return (
    <EmptyState
      icon="search"
      title="No matching settings"
      description={`No Settings page has "${query.trim()}" in its name.`}
    />
  );
}
