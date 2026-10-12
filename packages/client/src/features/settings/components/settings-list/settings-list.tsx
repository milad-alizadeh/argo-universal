import type * as React from 'react';
import { FieldGroup } from '#lib/generic/primitives/fields/field-group/field-group';
import { FieldSection } from '#lib/generic/primitives/fields/field-section/field-section';
import { ListItem } from '#lib/generic/primitives/lists/list-item/list-item';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { deviceRows, matchingRows, serverRows } from './settings-list-data';
import type { SettingsListProps } from './settings-list-props';
import { SettingsRows } from './settings-list-rows';

export type { SettingsListProps } from './settings-list-props';

// Every width draws the pages in one flat list, without group headings, narrowed by the search.
export function SettingsList(props: SettingsListProps): React.JSX.Element {
  const wide = useWide();
  const rows = matchingRows(
    [...serverRows(props, wide), ...deviceRows(props, wide)],
    props.query,
  );
  return (
    <FieldGroup variant="navigation">
      <FieldSection>
        {rows.length > 0 ? (
          <SettingsRows {...props} rows={rows} />
        ) : (
          <ListItem title="No settings match." />
        )}
      </FieldSection>
    </FieldGroup>
  );
}
