import type * as React from 'react';
import { FieldGroup } from '#primitives/field-group';
import { FieldSection } from '#primitives/field-section';
import { useWide } from '../../../lib/generic/use-wide';
import { deviceRows, serverRows } from './settings-list-data';
import { deviceName } from './settings-list-labels';
import type { SettingsListProps } from './settings-list-props';
import { SettingsRows } from './settings-list-rows';

export type { SettingsListProps } from './settings-list-props';

export function SettingsList(props: SettingsListProps): React.JSX.Element {
  const wide = useWide();
  return (
    <FieldGroup variant={wide ? 'navigation' : 'grouped'}>
      <FieldSection
        title={props.serverName ? `Server · ${props.serverName}` : 'Server'}
      >
        <SettingsRows {...props} rows={serverRows(props, wide)} />
      </FieldSection>
      <FieldSection title={props.deviceName ?? deviceName(wide)}>
        <SettingsRows {...props} rows={deviceRows(props, wide)} />
      </FieldSection>
    </FieldGroup>
  );
}
