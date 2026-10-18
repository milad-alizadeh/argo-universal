import type * as React from 'react';
import { Icon } from '#primitives/content/icon';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { Pill } from '#primitives/status/pill';
import { GroupedListItem } from './grouped-list-item';
import { onPress } from './grouped-list-item-press.mocks';

export function PlainRows(): React.JSX.Element {
  return (
    <GroupedListSection title="Without icons">
      <GroupedListItem label="Name" value="Argo" onPress={onPress} />
      <GroupedListItem label="Version" value="1.0" />
    </GroupedListSection>
  );
}

export function CodeRows(): React.JSX.Element {
  return (
    <GroupedListSection title="Code and actions">
      <GroupedListItem code label="--experimental-acp" onPress={onPress} />
      <EnvironmentVariableRow />
      <AddArgumentRow />
    </GroupedListSection>
  );
}

function EnvironmentVariableRow(): React.JSX.Element {
  return (
    <GroupedListItem
      code
      label="EXAMPLE_HOME"
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
      label="Add argument"
      onPress={onPress}
    />
  );
}

export function LargeRows(): React.JSX.Element {
  return (
    <GroupedListSection title="Large, with a muted description">
      <GroupedListItem
        size="lg"
        tone="muted"
        label="ACP wrapper for Anthropic’s Claude"
        leading={<Icon name="agent" role="row" className="text-foreground" />}
        accessory={<ReadyBadge />}
      />
    </GroupedListSection>
  );
}

function ReadyBadge(): React.JSX.Element {
  return <Pill tone="success" text="Ready" />;
}

export function StateRows(): React.JSX.Element {
  return (
    <GroupedListSection title="Loading and failure">
      <GroupedListItem label="Connecting to the Server…" loading />
      <GroupedListItem label="Couldn't reach the Server." tone="danger" />
    </GroupedListSection>
  );
}
