import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  liveTreeAfter,
  type HashedTree,
  type LiveAnswer,
} from '@repo/contracts/plugins/page-draw';
import { expect, it, onTestFinished } from 'vitest';
import { processWait } from '../mocks/data-fixture';
import { finished, nextAnswer, start, type Kit } from './loader-live-fixture';

type Subscription = {
  next: () => Promise<LiveAnswer | undefined>;
  leave: () => void;
};

function subscribe(kit: Kit, path: string, known?: string): Subscription {
  const controller = new AbortController();
  const answers = kit.pages.live({ path, known }, controller.signal);

  onTestFinished(() => controller.abort());

  return {
    next: () => nextAnswer(kit, answers),
    leave: () => controller.abort(),
  };
}

function treeOf(answer: LiveAnswer | undefined): HashedTree {
  if (answer?.kind !== 'tree') throw new Error(`Answered ${answer?.kind}`);

  return { root: answer.root, hash: answer.hash };
}

function patched(kept: HashedTree, answer: LiveAnswer | undefined): HashedTree {
  if (answer?.kind !== 'patch') throw new Error(`Answered ${answer?.kind}`);

  const after = liveTreeAfter(kept, answer);

  if (!after) throw new Error('The patch does not fit the tree kept');

  return after;
}

const rowsOf = ({ root }: HashedTree): unknown[] =>
  root.children.map((row) => row.props.title);

it('draws a live page once at its first value, says it is live, and stops its Loader', async () => {
  const { kit } = await start();

  expect(await kit.pages.draw({ path: '/log' })).toMatchObject({
    kind: 'tree',
    live: true,
    root: { type: 'List', children: [] },
  });
  expect(await finished(kit)).toBe('1,0');
});

it('sends the tree whole, then a keyed patch for each value the Loader yields', async () => {
  const { kit } = await start();
  const log = subscribe(kit, '/log');
  const first = treeOf(await log.next());

  await kit.operations.run({ name: 'append', params: { line: 'one' } });

  const second = await log.next();

  expect(second).toMatchObject({
    kind: 'patch',
    base: first.hash,
    ops: [{ op: 'insert', index: 0, node: { key: 'one' } }],
  });
  expect(rowsOf(patched(first, second))).toEqual(['one']);
});

it('answers unchanged when the App keeps the first tree', async () => {
  const { kit } = await start();
  const first = treeOf(await subscribe(kit, '/log').next());

  expect(await subscribe(kit, '/log', first.hash).next()).toEqual({
    kind: 'unchanged',
    hash: first.hash,
  });
});

it('prepending to 2,000 live rows sends one keyed insert', async () => {
  const { kit } = await start();
  const rows = subscribe(kit, '/rows');
  const first = treeOf(await rows.next());

  expect(first.root.children).toHaveLength(2000);
  await kit.operations.run({ name: 'change', params: { how: 'prepend' } });

  const answer = await rows.next();

  expect(answer).toMatchObject({
    kind: 'patch',
    ops: [{ op: 'insert', index: 0, node: { key: 'new' } }],
  });
  expect(answer?.kind === 'patch' && answer.ops).toHaveLength(1);
  expect(rowsOf(patched(first, answer))[0]).toBe('new');
}, 20_000);

it.each([
  ['move', 'move'],
  ['rename', 'setProps'],
  ['retype', 'replace'],
  ['remove', 'remove'],
])(
  'a %s of the live rows sends one %s op, which leaves the tree a draw gives',
  async (how, op) => {
    const { kit } = await start();
    const rows = subscribe(kit, '/rows');
    const first = treeOf(await rows.next());

    await kit.operations.run({ name: 'change', params: { how } });

    const answer = await rows.next();

    expect(answer).toMatchObject({ kind: 'patch', ops: [{ op }] });
    expect(answer?.kind === 'patch' && answer.ops).toHaveLength(1);

    const drawn = await kit.pages.draw({ path: '/rows' });

    expect(drawn.kind === 'tree' && drawn.root).toEqual(
      patched(first, answer).root,
    );
  },
  20_000,
);

it('stops the Loader when the App leaves, so its finally runs once its wait settles', async () => {
  const { kit } = await start();
  const log = subscribe(kit, '/log');

  await log.next();
  log.leave();
  expect(await log.next()).toBeUndefined();

  await kit.operations.run({ name: 'append', params: { line: 'late' } });
  await expect.poll(() => finished(kit), processWait).toBe('1,0');
});

it('ends a live page whose Loader stopped, threw, or has a paged list', async () => {
  const { kit } = await start();
  const once = subscribe(kit, '/once');

  expect(await once.next()).toMatchObject({ kind: 'tree' });
  expect(await once.next()).toBeUndefined();

  const throws = subscribe(kit, '/throws');

  expect(await throws.next()).toMatchObject({ kind: 'tree' });
  await kit.operations.run({ name: 'append', params: { line: 'wake' } });
  expect(await throws.next()).toEqual({
    kind: 'failed',
    error: 'The tail broke',
  });

  expect(await subscribe(kit, '/listed').next()).toEqual({
    kind: 'failed',
    error: 'A live page has no paged list',
  });
});

it('ends a live page when its Plugin runs again', async () => {
  const { kit, directory } = await start();
  const log = subscribe(kit, '/log');

  await log.next();
  await appendFile(join(directory, 'index.tsx'), '\n// Edited.\n');

  expect(await log.next()).toEqual({ kind: 'failed', error: 'Plugin stopped' });
}, 20_000);
