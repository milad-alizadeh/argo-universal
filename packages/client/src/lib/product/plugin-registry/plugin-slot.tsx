import type { WireNode } from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import { List } from '#primitives/lists/list';
import { PluginTree, type PluginOnEvent } from './plugin-registry';

export interface PluginSlotContribution {
  pluginId: string;
  // The Plugin's name, shown as the section's title.
  name: string;
  root: WireNode;
  onEvent: PluginOnEvent;
}

export interface PluginSlotProps {
  // In the Server's order; a Plugin that has drawn nothing yet is left out, so it leaves no gap.
  contributions: readonly PluginSlotContribution[];
}

// A core page's Slot: one titled section per Plugin, the Plugin's tree inside it. Core owns the frame, so a Plugin never sizes or styles it.
export function PluginSlot({
  contributions,
}: PluginSlotProps): React.JSX.Element {
  return (
    <>
      {contributions.map(({ pluginId, name, root, onEvent }) => (
        <List.Section key={pluginId} title={name}>
          <PluginTree root={root} onEvent={onEvent} />
        </List.Section>
      ))}
    </>
  );
}
