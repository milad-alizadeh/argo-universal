import type * as React from 'react';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldSection } from '#primitives/fields/field-section';
import { ListItem } from '#primitives/lists/list-item';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { settingsRows } from './settings-list-data';
import type { SettingsListProps } from './settings-list-props';
import { SettingsRows } from './settings-list-rows';

export type { SettingsListProps } from './settings-list-props';

// One list of the pages, without group headings, narrowed by the search: a grouped card on a phone, the sidebar in a wide window.
export function SettingsList(props: SettingsListProps): React.JSX.Element {
  return (
    <FieldGroup variant={useWide() ? 'navigation' : 'grouped'}>
      <FieldSection>
        <MatchingRows {...props} />
      </FieldSection>
    </FieldGroup>
  );
}

function MatchingRows(props: SettingsListProps): React.JSX.Element {
  const rows = settingsRows(props, useWide());

  if (rows.length === 0) return <ListItem title="No settings match." />;

  return (
    <SettingsRows
      rows={rows}
      selectedDestination={props.selectedDestination}
      onSelect={props.onSelect}
    />
  );
}
