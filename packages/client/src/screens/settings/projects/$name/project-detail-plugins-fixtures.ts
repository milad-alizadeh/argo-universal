import type { WireNode } from '@repo/contracts/plugins/wire';
import { slotCounterRoot } from '@repo/contracts/plugins/wire-fixtures';
import type { PluginSlotContribution } from '../../../../lib/product/plugin-registry';

const row = (key: string, title: string): WireNode => ({
  type: 'ListItem',
  key,
  props: { title },
  children: [],
  slots: {},
});

const trackerRoot: WireNode = {
  type: 'List',
  key: 'tracker',
  props: {},
  children: [row('none', 'None'), row('github', 'GitHub Issues')],
  slots: {},
};

// Two Plugins that contribute to Project details, in the Server's order; a story adds the `onEvent` spy.
export const pluginContributions: Omit<PluginSlotContribution, 'onEvent'>[] = [
  {
    pluginId: 'example',
    name: 'Example',
    root: slotCounterRoot,
  },
  {
    pluginId: 'issue-tracker',
    name: 'Issue tracker',
    root: trackerRoot,
  },
];
