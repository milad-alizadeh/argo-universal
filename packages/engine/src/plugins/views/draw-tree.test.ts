import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import { nextRoot } from '@repo/contracts/plugins/wire-patch';
import { expect, it } from 'vitest';
import { drawTree } from './draw-tree';
import { createOpenView, type OpenView, type Opening } from './open-view';

type Drawn = { view: OpenView; sent: ViewMessage[]; logs: string[] };

function drawn(messages: ViewMessage[], opening: Opening): Drawn {
  const view = createOpenView('atlas', opening, 'connection');
  const sent: ViewMessage[] = [];
  const logs: string[] = [];
  view.events.on('message', (message) => sent.push(message));

  for (const [index, message] of messages.entries())
    drawTree(view, message, {
      log: (line) => logs.push(line),
      revision: index + 1,
    });

  return { view, sent, logs };
}

const leaf = (key: string, props: WireNode['props']): WireNode => ({
  type: 'Text',
  key,
  props,
  children: [],
  slots: {},
});

const stack = (children: WireNode[]): WireNode => ({
  ...leaf('root', { direction: 'column' }),
  type: 'Stack',
  children,
});

const svg = (xml: string, key: string): WireNode => ({
  ...leaf(key, { xml, label: key }),
  type: 'Svg',
});

const unsafe = svg('<svg><script/></svg>', 'unsafe');

const map = { path: '/map' };

const refusedLine =
  'Plugin atlas: refused /map node Stack#root/Svg#unsafe: element <script> refused';

it('drops refused SVG nodes from an ordinary page and sends canonical markup', () => {
  const circle = '<svg><circle cx="2" cy="3" r="1" fill="currentColor"/></svg>';
  const root = stack([svg(circle, 'valid'), unsafe]);

  const { sent, logs } = drawn([{ type: 'snapshot', revision: 1, root }], map);

  expect(sent).toMatchObject([
    {
      type: 'snapshot',
      root: {
        children: [
          {
            key: 'valid',
            props: {
              xml: '<svg><circle cx="2" cy="3" fill="currentColor" r="1"/></svg>',
            },
          },
        ],
      },
    },
  ]);
  expect(logs).toEqual([refusedLine]);
});

it('drops refused SVG nodes from an ordinary Slot without refusing its view', () => {
  const root = {
    ...stack([]),
    slots: { leading: [svg('<svg><path d="M0 0"/></svg>', 'valid'), unsafe] },
  };

  const { view, sent, logs } = drawn(
    [{ type: 'snapshot', revision: 1, root }],
    {
      ...map,
      slot: {
        slotId: 'argo/project/details/v1',
        context: { projectId: 'argo' },
      },
    },
  );

  expect(view.refused).toBe(false);
  expect(sent.map(({ type }) => type)).toEqual(['snapshot']);
  expect(logs).toEqual([refusedLine]);
});

const before = leaf('label', { children: 'Before' });

const page = stack([{ ...leaf('unknown', {}), type: 'FutureLeaf' }, before]);

const setLabel = (revision: number, props: WireNode['props']): ViewMessage => ({
  type: 'patch',
  revision,
  ops: [{ op: 'setProps', key: ['label'], props }],
});

it('rebases patches after pruning, and advances revisions for stripped props', () => {
  const after = { children: 'After' };

  const { view, sent } = drawn(
    [
      { type: 'snapshot', revision: 1, root: page },
      setLabel(2, after),
      setLabel(3, { ...after, futureProp: 'Unknown optional prop' }),
    ],
    map,
  );

  const { viewId } = view.opening;

  expect(sent).toEqual([
    { type: 'snapshot', revision: 1, viewId, root: stack([before]) },
    { ...setLabel(2, after), viewId },
    {
      type: 'snapshot',
      revision: 3,
      viewId,
      root: stack([leaf('label', after)]),
    },
  ]);
});

it('recovers when an invalid container becomes valid in a patch', () => {
  const { sent } = drawn(
    [
      {
        type: 'snapshot',
        revision: 1,
        root: { ...page, props: { direction: 'broken' } },
      },
      {
        type: 'patch',
        revision: 2,
        ops: [{ op: 'setProps', key: [], props: { direction: 'column' } }],
      },
    ],
    map,
  );

  expect(sent).toMatchObject([
    {
      type: 'snapshot',
      root: { type: 'Text', props: { children: 'Update Argo to see this' } },
    },
    {
      type: 'patch',
      ops: [{ op: 'replace', key: [], node: { type: 'Stack' } }],
    },
  ]);
  expect(sent.reduce<WireNode | null>(nextRoot, null)).toEqual(stack([before]));
});
