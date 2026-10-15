import type * as React from 'react';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { settingsRows } from './settings-list-data';
import type { SettingsListProps } from './settings-list-props';
import { settingsRowItems } from './settings-list-rows';

export type { SettingsListProps } from './settings-list-props';

// One list of the pages, without group headings, narrowed by the search: a grouped card on a phone, the sidebar in a wide window.
export function SettingsList(props: SettingsListProps): React.JSX.Element {
  const wide = useWide();

  return (
    <GroupedList variant={wide ? 'sidebar' : 'grouped'}>
      <GroupedListSection>
        {matchingRows(props, settingsRows(props, wide))}
      </GroupedListSection>
    </GroupedList>
  );
}

// A section takes each child as one row, so the rows are returned as elements, not one component.
function matchingRows(
  props: SettingsListProps,
  rows: ReturnType<typeof settingsRows>,
): React.JSX.Element[] {
  if (rows.length === 0)
    return [<GroupedListItem key="none" label="No settings match." />];

  return settingsRowItems({
    rows,
    selectedDestination: props.selectedDestination,
    onSelect: props.onSelect,
  });
}
