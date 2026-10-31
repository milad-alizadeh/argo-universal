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

// A section the host draws around one Plugin's tree: the host's own section kind, titled with the Plugin's name.
export type PluginSectionFrame = (frame: {
  key: string;
  title: string;
  children: React.ReactNode;
}) => React.ReactElement;

/*
 * A core page's Slot as one titled section per Plugin, the Plugin's tree inside it. Core owns the frame, so a Plugin
 * never sizes or styles it, and the host picks the section kind: a FieldGroup finds its sections by element type, so
 * `frame` is called here, not rendered, and what it returns is the host's own section element.
 */
export function pluginSlotSections(
  contributions: readonly PluginSlotContribution[],
  frame: PluginSectionFrame,
): React.ReactElement[] {
  return contributions.map(({ pluginId, name, viewId, ...tree }) =>
    frame({
      key: pluginId,
      title: name,
      children: <PluginTree key={viewId} {...tree} />,
    }),
  );
}

const listSection: PluginSectionFrame = ({ key, title, children }) => (
  <List.Section key={key} title={title}>
    {children}
  </List.Section>
);

// The Slot in a List host: each Plugin is a `List.Section`.
export function PluginSlot({
  contributions,
}: PluginSlotProps): React.ReactNode {
  return pluginSlotSections(contributions, listSection);
}
