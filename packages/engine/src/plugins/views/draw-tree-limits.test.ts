import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import {
  pluginPageBytes,
  pluginPageFallback,
} from '@repo/contracts/plugins/wire-limits';
import { expect, it } from 'vitest';
import { drawTree } from './draw-tree';
import { createOpenView } from './open-view';

const large: WireNode = {
  type: 'Stack',
  key: 'root',
  props: { direction: 'column' },
  slots: {},
  children: Array.from({ length: 9000 }, (_, index) => ({
    type: 'Stack',
    key: String(index),
    props: { direction: 'row', gap: 7 },
    children: [],
    slots: {},
  })),
};

const small: WireNode = {
  type: 'Text',
  key: 'ready',
  props: { children: 'Recovered' },
  children: [],
  slots: {},
};

type Drawn = { sent: ViewMessage[]; logs: string[] };

function drawn(messages: ViewMessage[]): Drawn {
  const view = createOpenView('atlas', { path: '/map' }, 'connection');
  const sent: ViewMessage[] = [];
  const logs: string[] = [];
  view.events.on('message', (message) => sent.push(message));

  for (const [index, message] of messages.entries())
    drawTree(view, message, {
      log: (line) => logs.push(line),
      revision: index + 1,
    });

  return { sent, logs };
}

it('caps a page that becomes too large only after invalid containers become Update Argo', () => {
  expect(Buffer.byteLength(JSON.stringify(large))).toBeLessThan(
    pluginPageBytes,
  );

  const { sent } = drawn([{ type: 'snapshot', revision: 1, root: large }]);

  expect(sent).toMatchObject([{ type: 'snapshot', root: pluginPageFallback }]);
});

it('logs one refusal and recovers from an admissible patch using the last tree actually sent', () => {
  const { sent, logs } = drawn([
    { type: 'snapshot', revision: 1, root: large },
    { type: 'snapshot', revision: 2, root: large },
    {
      type: 'patch',
      revision: 3,
      ops: [{ op: 'replace', key: [], node: small }],
    },
  ]);

  expect(sent).toMatchObject([
    { type: 'snapshot', revision: 1, root: { key: 'fallback' } },
    {
      type: 'patch',
      revision: 3,
      ops: [{ op: 'replace', key: [], node: small }],
    },
  ]);
  expect(logs).toEqual([
    `Plugin atlas: refused /map: prepared page exceeds ${pluginPageBytes} bytes`,
  ]);
});

it('waits for a snapshot after refusing a message the worker sent over the cap', () => {
  const oversized: WireNode = {
    ...small,
    props: { children: 'x'.repeat(pluginPageBytes) },
  };

  const { sent, logs } = drawn([
    { type: 'snapshot', revision: 1, root: oversized },
    {
      type: 'patch',
      revision: 2,
      ops: [{ op: 'setProps', key: [], props: { children: 'Patched' } }],
    },
    { type: 'snapshot', revision: 3, root: small },
  ]);

  expect(sent).toMatchObject([
    { type: 'snapshot', revision: 1, root: pluginPageFallback },
    { type: 'snapshot', revision: 3, root: small },
  ]);
  expect(logs).toHaveLength(1);
});
