import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import { expect, it } from 'vitest';
import { preparedView } from './prepared-view';

const leaf = (key: string, label: string): WireNode => ({
  type: 'Text',
  key,
  props: { children: label },
  children: [],
  slots: {},
});

const root: WireNode = {
  type: 'Stack',
  key: 'root',
  props: { direction: 'column' },
  children: [
    { ...leaf('unknown', 'Hidden'), type: 'FutureLeaf' },
    leaf('label', 'Before'),
  ],
  slots: {},
};

async function* messages(): AsyncGenerator<ViewMessage> {
  yield { type: 'snapshot', revision: 1, root };
  yield {
    type: 'patch',
    revision: 2,
    ops: [{ op: 'setProps', key: ['label'], props: { children: 'After' } }],
  };
  yield {
    type: 'patch',
    revision: 3,
    ops: [
      {
        op: 'setProps',
        key: ['label'],
        props: { children: 'After', futureProp: 'Unknown optional prop' },
      },
    ],
  };
}

async function collect(
  source: AsyncIterable<ViewMessage>,
): Promise<ViewMessage[]> {
  const received: ViewMessage[] = [];

  for await (const message of source) received.push(message);

  return received;
}

it('rebases patches after pruning, and advances revisions for stripped props', async () => {
  const received = await collect(preparedView(messages()));

  expect(received[0]).toEqual({
    type: 'snapshot',
    revision: 1,
    root: { ...root, children: [leaf('label', 'Before')] },
  });
  expect(received[1]).toEqual({
    type: 'patch',
    revision: 2,
    ops: [
      {
        op: 'setProps',
        key: ['label'],
        props: { children: 'After' },
        unset: undefined,
      },
    ],
  });
  expect(received[2]).toEqual({
    type: 'snapshot',
    revision: 3,
    root: { ...root, children: [leaf('label', 'After')] },
  });
});

async function* changing(): AsyncGenerator<ViewMessage> {
  yield {
    type: 'snapshot',
    revision: 1,
    root: { ...root, props: { direction: 'broken' } },
  };
  yield {
    type: 'patch',
    revision: 2,
    ops: [{ op: 'setProps', key: [], props: { direction: 'column' } }],
  };
}

function snapshotOf(
  message: ViewMessage | undefined,
): Extract<ViewMessage, { type: 'snapshot' }> {
  if (message?.type !== 'snapshot') throw new Error('Expected a snapshot');

  return message;
}

function patchOf(
  message: ViewMessage | undefined,
): Extract<ViewMessage, { type: 'patch' }> {
  if (message?.type !== 'patch') throw new Error('Expected a patch');

  return message;
}

it('recovers when an invalid container becomes valid in a patch', async () => {
  const received = await collect(preparedView(changing()));

  const [first, second] = received;

  expect(first).toMatchObject({
    type: 'snapshot',
    root: { type: 'Text', props: { children: 'Update Argo to see this' } },
  });

  expect(second).toMatchObject({
    type: 'patch',
    ops: [{ op: 'replace', key: [], node: { type: 'Stack' } }],
  });
  const snapshot = snapshotOf(first);
  const patch = patchOf(second);

  expect(applyPatch(snapshot.root, patch.ops).children).toEqual([
    leaf('label', 'Before'),
  ]);
});
