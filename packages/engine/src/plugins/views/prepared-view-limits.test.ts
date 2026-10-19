import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import {
  pluginPageBytes,
  pluginPageFallback,
} from '@repo/contracts/plugins/wire-limits';
import { expect, it } from 'vitest';
import { preparedView } from './prepared-view';

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

async function* oversized(): AsyncGenerator<ViewMessage> {
  yield { type: 'snapshot', revision: 1, root: large };
}

it('caps a page that becomes too large only after invalid containers become Update Argo', async () => {
  expect(Buffer.byteLength(JSON.stringify(large))).toBeLessThan(
    pluginPageBytes,
  );
  const stream = preparedView(oversized());

  const message = (await stream.next()).value;

  if (!message) throw new Error('Expected a message');

  expect(message.type).toBe('snapshot');

  if (message.type !== 'snapshot') throw new Error('Expected a snapshot');

  expect(message.root.type).toBe('Text');
  expect(message.root).toEqual(pluginPageFallback);

  await stream.return();
});

const small: WireNode = {
  type: 'Text',
  key: 'ready',
  props: { children: 'Recovered' },
  children: [],
  slots: {},
};

async function* recovering(): AsyncGenerator<ViewMessage> {
  yield { type: 'snapshot', revision: 1, root: large };
  yield { type: 'snapshot', revision: 2, root: large };
  yield {
    type: 'patch',
    revision: 3,
    ops: [{ op: 'replace', key: [], node: small }],
  };
}

it('logs one refusal and recovers from an admissible patch using the last tree actually sent', async () => {
  const reasons: string[] = [];

  const stream = preparedView(recovering(), (reason) => reasons.push(reason));

  const first = (await stream.next()).value;
  const recovered = (await stream.next()).value;

  expect(first).toMatchObject({
    type: 'snapshot',
    revision: 1,
    root: { key: 'fallback' },
  });
  expect(recovered).toMatchObject({
    type: 'patch',
    revision: 3,
    ops: [{ op: 'replace', key: [], node: small }],
  });

  expect(reasons).toEqual([`prepared page exceeds ${pluginPageBytes} bytes`]);

  await stream.return();
});
