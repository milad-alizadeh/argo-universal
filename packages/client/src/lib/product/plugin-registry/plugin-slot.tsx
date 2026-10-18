import type { WireNode } from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import { GroupedListContent } from '#primitives/lists/grouped-list-content';
import { PluginTree } from './plugin-registry';

export interface PluginSlotContribution {
  pluginId: string;
  // The Plugin's name, shown as the section's title.
  name: string;
  root: WireNode;
  onEvent: (eventId: string) => void;
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
        <GroupedListContent key={pluginId} title={name}>
          <PluginTree root={root} onEvent={onEvent} />
        </GroupedListContent>
      ))}
    </>
  );
}
