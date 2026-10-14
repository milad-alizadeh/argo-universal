import type * as React from 'react';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { settingsRows } from './settings-list-data';
import type { SettingsListProps } from './settings-list-props';
import { SettingsRows } from './settings-list-rows';

export type { SettingsListProps } from './settings-list-props';

// One list of the pages, without group headings, narrowed by the search: a grouped card on a phone, the sidebar in a wide window.
export function SettingsList(props: SettingsListProps): React.JSX.Element {
  return (
    <GroupedList variant={useWide() ? 'sidebar' : 'grouped'}>
      <GroupedListSection>
        <MatchingRows {...props} />
      </GroupedListSection>
    </GroupedList>
  );
}

function MatchingRows(props: SettingsListProps): React.JSX.Element {
  const rows = settingsRows(props, useWide());

  if (rows.length === 0) return <GroupedListItem label="No settings match." />;

  return (
    <SettingsRows
      rows={rows}
      selectedDestination={props.selectedDestination}
      onSelect={props.onSelect}
    />
  );
}
