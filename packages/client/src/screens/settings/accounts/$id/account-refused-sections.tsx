import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';

export interface RefusedPlugin {
  pluginId: string;
  name: string;
}

const refusedTitle = 'Plugins refused access';

const allowButton = (onPress: () => void): React.JSX.Element => (
  <Button label="Allow access" variant="secondary" onPress={onPress} />
);

const refusedSection = (
  plugin: RefusedPlugin,
  first: boolean,
  onAllow: (pluginId: string) => void,
): React.JSX.Element => (
  <FieldGroup.Section
    key={plugin.pluginId}
    title={first ? refusedTitle : undefined}
  >
    <FieldGroup.Value title={plugin.name} value="Refused" />
    {allowButton(() => onAllow(plugin.pluginId))}
  </FieldGroup.Section>
);

// One section per refused Plugin, so each Allow access sits under the Plugin it restores.
export const refusedSections = (
  refused: RefusedPlugin[],
  onAllow: (pluginId: string) => void,
): React.JSX.Element[] =>
  refused.map((plugin, index) => refusedSection(plugin, index === 0, onAllow));
