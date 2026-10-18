import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { createOpenView } from './open-view';
import { receive } from './view-state';

const svg = (xml: string, key: string): WireNode => ({
  type: 'Svg',
  key,
  props: { xml, label: key },
  children: [],
  slots: {},
});

it('drops refused SVG nodes from an ordinary page and sends canonical markup', () => {
  const view = createOpenView('atlas', { path: '/map' }, 'connection');
  const messages: ViewMessage[] = [];
  const logs: string[] = [];
  view.events.on('message', (message) => messages.push(message));

  receive(
    view,
    {
      type: 'snapshot',
      revision: 1,
      root: {
        type: 'Column',
        key: 'root',
        props: {},
        children: [
          svg(
            '<svg><circle cx="2" cy="3" r="1" fill="currentColor"/></svg>',
            'valid',
          ),
          svg('<svg><script/></svg>', 'unsafe'),
        ],
        slots: {},
      },
    },
    { revision: 4, log: (line) => logs.push(line) },
  );

  const tree = required(view.root);
  const firstChild = required(tree.children[0]);
  const message = required(messages[0]);

  expect(tree.children.map(({ key }) => key)).toEqual(['valid']);
  expect(firstChild.props.xml).toBe(
    '<svg><circle cx="2" cy="3" fill="currentColor" r="1"/></svg>',
  );
  expect(messages).toHaveLength(1);
  expect(message.type).toBe('snapshot');
  expect(logs).toEqual([
    'Plugin atlas: refused /map node Column#root/Svg#unsafe: element <script> refused',
  ]);
});

it('drops refused SVG nodes from an ordinary Slot without refusing its view', () => {
  const view = createOpenView(
    'atlas',
    {
      path: '/map',
      slot: {
        slotId: 'argo/project/details/v1',
        context: { projectId: 'argo' },
      },
    },
    'connection',
  );

  const messages: ViewMessage[] = [];
  const logs: string[] = [];
  view.events.on('message', (message) => messages.push(message));

  receive(
    view,
    {
      type: 'snapshot',
      revision: 1,
      root: {
        type: 'Column',
        key: 'root',
        props: {},
        children: [],
        slots: {
          leading: [
            svg('<svg><path d="M0 0"/></svg>', 'valid'),
            svg('<svg><script/></svg>', 'unsafe'),
          ],
        },
      },
    },
    { revision: 4, log: (line) => logs.push(line) },
  );

  const tree = required(view.root);
  const message = required(messages[0]);

  expect(view.refused).toBe(false);
  expect(tree.slots.leading?.map(({ key }) => key)).toEqual(['valid']);
  expect(message.type).toBe('snapshot');
  expect(logs).toEqual([
    'Plugin atlas: refused /map node Column#root/Svg#unsafe: element <script> refused',
  ]);
});

function required<T>(value: T | null | undefined): T {
  if (value === undefined || value === null)
    throw new Error('Expected a value in the received view');

  return value;
}
