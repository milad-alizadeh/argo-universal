import type * as React from 'react';
import { Badge } from '#primitives/display/badge';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import { FieldSection } from '#primitives/fields/field-section';
import { ListItem } from './list-item';
import { onPress } from './list-item-press.mocks';

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
