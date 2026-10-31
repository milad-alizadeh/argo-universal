import { WireNode } from '@repo/contracts/plugins/wire';
import { slotCounterRoot } from '@repo/contracts/plugins/wire-fixtures';
import canvasScene from '@repo/mocks/plugins/canvas.json' with { type: 'json' };
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

// What the Code Map draws: a Canvas, then a caption as long as its legend, which wraps rather than runs on.
const codeMapRoot: WireNode = {
  type: 'Stack',
  key: 'map',
  props: { direction: 'column', gap: 4 },
  children: [
    WireNode.parse(canvasScene),
    {
      type: 'Text',
      key: 'legend',
      props: {
        children:
          'Area: lines · Colour: branching lines · Shade: changes in the last 1,000 commits',
        role: 'secondary',
        tone: 'muted',
      },
      children: [],
      slots: {},
    },
  ],
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

// The Code Map's section, held apart because its Canvas draws on CanvasKit, which a story that does not look at it should not wait for.
export const codeMapContribution: Omit<PluginSlotContribution, 'onEvent'> = {
  pluginId: 'code-map',
  name: 'Code Map',
  root: codeMapRoot,
};
