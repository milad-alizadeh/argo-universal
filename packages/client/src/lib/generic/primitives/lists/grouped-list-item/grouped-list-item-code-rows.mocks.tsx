import type * as React from 'react';
import { Badge } from '#primitives/display/badge';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { GroupedListItem } from './grouped-list-item';
import { onPress } from './grouped-list-item-press.mocks';

export function PlainRows(): React.JSX.Element {
  return (
    <GroupedListSection title="Without icons">
      <GroupedListItem title="Name" value="Argo" onPress={onPress} />
      <GroupedListItem title="Version" value="1.0" />
    </GroupedListSection>
  );
}

export function CodeRows(): React.JSX.Element {
  return (
    <GroupedListSection title="Code and actions">
      <GroupedListItem code title="--experimental-acp" onPress={onPress} />
      <EnvironmentVariableRow />
      <AddArgumentRow />
    </GroupedListSection>
  );
}

function EnvironmentVariableRow(): React.JSX.Element {
  return (
    <GroupedListItem
      code
      title="EXAMPLE_HOME"
      subtitle={{ text: '/Users/example/.example', code: true }}
      onPress={onPress}
    />
  );
}

function AddArgumentRow(): React.JSX.Element {
  return (
    <GroupedListItem
      icon="add"
      tone="accent"
      title="Add argument"
      onPress={onPress}
    />
  );
}

export function LargeRows(): React.JSX.Element {
  return (
    <GroupedListSection title="Large, with a muted description">
      <GroupedListItem
        size="large"
        tone="muted"
        title="ACP wrapper for Anthropic’s Claude"
        leading={<Icon name="agent" role="row" className="text-foreground" />}
        accessory={<ReadyBadge />}
      />
    </GroupedListSection>
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
    <GroupedListSection title="Loading and failure">
      <GroupedListItem title="Connecting to the Server…" loading />
      <GroupedListItem title="Couldn't reach the Server." tone="destructive" />
    </GroupedListSection>
  );
}
