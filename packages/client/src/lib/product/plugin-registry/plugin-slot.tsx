import type { WireNode, PluginViewId } from '@repo/contracts/plugins/wire';
import { List } from '@repo/kit/primitives/lists/list';
import type * as React from 'react';
import type { OpenPluginPage } from '../plugin-actions';
import { PluginTree, type PluginOnEvent } from './plugin-registry';

export interface PluginSlotContribution {
  pluginId: string;
  // The Plugin's name, shown as the section's title.
  name: string;
  root: WireNode;
  viewId?: PluginViewId | null;
  onEvent: PluginOnEvent;
  onOpenPage?: OpenPluginPage;
}

export interface PluginSlotProps {
  // In the Server's order; a Plugin that has drawn nothing yet is left out, so it leaves no gap.
  contributions: readonly PluginSlotContribution[];
}

// A core page's Slot: one titled section per Plugin, the Plugin's tree inside it. Core owns the frame, so a Plugin never sizes or styles it.
export function PluginSlot({
  contributions,
}: PluginSlotProps): React.ReactNode {
  return contributions.map(({ pluginId, name, viewId, ...tree }) => (
    <List.Section key={pluginId} title={name}>
      <PluginTree key={viewId} {...tree} />
    </List.Section>
  ));
}
