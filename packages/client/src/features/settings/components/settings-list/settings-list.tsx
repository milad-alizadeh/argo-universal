import type * as React from 'react';
import { EmptyList } from '#features/sessions';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { settingsRows } from './settings-list-data';
import type { SettingsListProps } from './settings-list-props';
import { SettingsRows } from './settings-list-rows';

export type { SettingsListProps } from './settings-list-props';

// One list of the pages, without group headings, narrowed by the search: a grouped card on a phone, the sidebar in a wide window.
export function SettingsList(props: SettingsListProps): React.JSX.Element {
  const wide = useWide();
  const rows = settingsRows(props, wide);

  if (rows.length === 0) return <NoMatchingSettings query={props.query} />;

  return (
    <GroupedList variant={wide ? 'sidebar' : 'grouped'}>
      <GroupedListSection>
        <SettingsRows rows={rows} {...selectionOf(props)} />
      </GroupedListSection>
    </GroupedList>
  );
}

const selectionOf = ({
  selectedDestination,
  onSelect,
}: SettingsListProps): Pick<
  SettingsListProps,
  'selectedDestination' | 'onSelect'
> => ({ selectedDestination, onSelect });

// A search that finds nothing says so as the Sessions list does.
function NoMatchingSettings({
  query = '',
}: Pick<SettingsListProps, 'query'>): React.JSX.Element {
  return (
    <EmptyList
      title="No matching settings"
      message={`No Settings page has "${query.trim()}" in its name.`}
    />
  );
}
