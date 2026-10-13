import type * as React from 'react';
import { Badge } from '../src/lib/generic/primitives/display/badge/badge';
import { Text } from '../src/lib/generic/primitives/display/text/text';
import { FieldSection } from '../src/lib/generic/primitives/fields/field-section/field-section';
import { ListItem } from '../src/lib/generic/primitives/lists/list-item/list-item';
import { Icon } from '../src/lib/generic/symbols/icon';
import { onPress } from './list-item-press-mock';

export function PlainRows(): React.JSX.Element {
  return (
    <FieldSection title="Without icons">
      <ListItem title="Name" value="Argo" onPress={onPress} />
      <ListItem title="Version" value="1.0" />
    </FieldSection>
  );
}

export function CodeRows(): React.JSX.Element {
  return (
    <FieldSection title="Code and actions">
      <ListItem code title="--experimental-acp" onPress={onPress} />
      <EnvironmentVariableRow />
      <AddArgumentRow />
    </FieldSection>
  );
}

function EnvironmentVariableRow(): React.JSX.Element {
  return (
    <ListItem
      code
      title="EXAMPLE_HOME"
      subtitle={{ text: '/Users/example/.example', code: true }}
      onPress={onPress}
    />
  );
}

function AddArgumentRow(): React.JSX.Element {
  return (
    <ListItem icon="add" tone="accent" title="Add argument" onPress={onPress} />
  );
}

export function LargeRows(): React.JSX.Element {
  return (
    <FieldSection title="Large, with a muted description">
      <ListItem
        size="large"
        tone="muted"
        title="ACP wrapper for Anthropic’s Claude"
        leading={<Icon name="agent" role="row" className="text-foreground" />}
        accessory={<ReadyBadge />}
      />
    </FieldSection>
  );
}

function ReadyBadge(): React.JSX.Element {
  return (
    <Badge tone="success">
      <Text>Ready</Text>
    </Badge>
  );
}

export function StateRows(): React.JSX.Element {
  return (
    <FieldSection title="Loading and failure">
      <ListItem title="Connecting to the Server…" loading />
      <ListItem title="Couldn't reach the Server." tone="destructive" />
    </FieldSection>
  );
}
