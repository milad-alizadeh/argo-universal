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

  expect(view.root?.children.map(({ key }) => key)).toEqual(['valid']);
  expect(view.root?.children[0]?.props.xml).toBe(
    '<svg><circle cx="2" cy="3" fill="currentColor" r="1"/></svg>',
  );
  expect(messages).toHaveLength(1);
  expect(messages[0]?.type).toBe('snapshot');
  expect(logs).toEqual([
    'Plugin atlas: refused /map node Column#root/Svg#unsafe: element <script> refused',
  ]);
});
