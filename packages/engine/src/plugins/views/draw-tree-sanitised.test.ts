import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import { nextRoot } from '@repo/contracts/plugins/wire-patch';
import { expect, it } from 'vitest';
import { drawTree } from './draw-tree';
import { createOpenView } from './open-view';

const svg = (xml: string): WireNode => ({
  type: 'Svg',
  key: 'icon',
  props: { xml, label: 'icon' },
  children: [],
  slots: {},
});

const stack = (children: WireNode[]): WireNode => ({
  type: 'Stack',
  key: 'root',
  props: { direction: 'column' },
  children,
  slots: {},
});

const fixed = '<svg><path d="M0 0"/></svg>';

it('keeps the Plugin tree, so a patch can fix a node the sanitiser dropped', () => {
  const view = createOpenView('atlas', { path: '/map' }, 'connection');
  const sent: ViewMessage[] = [];
  view.events.on('message', (message) => sent.push(message));

  const messages: ViewMessage[] = [
    {
      type: 'snapshot',
      revision: 1,
      root: stack([svg('<svg><script/></svg>')]),
    },
    {
      type: 'patch',
      revision: 2,
      ops: [{ op: 'replace', key: ['icon'], node: svg(fixed) }],
    },
  ];

  for (const [index, message] of messages.entries())
    drawTree(view, message, { log: () => {}, revision: index + 1 });

  expect(sent).toMatchObject([
    { type: 'snapshot', root: { children: [] } },
    { type: 'patch', ops: [{ op: 'insert', node: { key: 'icon' } }] },
  ]);
  expect(sent.reduce<WireNode | null>(nextRoot, null)?.children).toMatchObject([
    { key: 'icon', props: { xml: fixed } },
  ]);
});
