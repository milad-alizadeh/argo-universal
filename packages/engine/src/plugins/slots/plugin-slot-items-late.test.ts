import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import {
  sessionRowSlotId,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { expect, it, vi } from 'vitest';
import { itemsLeftOut, type ItemsAnswer } from './kept-items';
import { slotItemsLateLimitMs, slotItemsLimitMs } from './late-items';
import { slotItems, type SlotItems } from './slot-items-fixture';

const input: SlotItemsInput = {
  slotId: sessionRowSlotId,
  contexts: [{ sessionId: 'first', projectId: 'argo' }],
};

const caller = { pluginId: 'counter', generation: 1 };

const answer = (id: number, text: string): SlotCall => ({
  action: 'items',
  id,
  items: { first: [{ text }] },
});

const answered = (text: string): ItemsAnswer => ({
  ok: true,
  items: { first: [{ text }] },
});

const standingIn = (text: string): ItemsAnswer => ({
  ok: true,
  items: { first: [{ text }] },
  standingInFor: itemsLeftOut.late,
});

const leftOutLate: ItemsAnswer = { ok: false, reason: itemsLeftOut.late };

// Lets every reply already received settle, so a dropped one has had its chance to land.
const settled = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Asks once and runs the call past its limit.
async function askedLate({ calls, clock }: SlotItems): Promise<ItemsAnswer> {
  const asked = calls.items('counter', input);

  clock.fire(slotItemsLimitMs);

  return asked;
}

// Hands the worker's late reply in and waits for the open lists to be asked again.
async function landed(run: SlotItems, id: number, text: string): Promise<void> {
  const before = run.calls.changes.version;

  run.calls.receive(caller, answer(id, text));
  await vi.waitFor(() =>
    expect(run.calls.changes.version).toBeGreaterThan(before),
  );
}

it('keeps an answer that lands after its call ran late, and asks the open lists again', async () => {
  const run = slotItems();
  const first = run.calls.items('counter', input);

  run.calls.receive(caller, answer(0, 'before'));
  await first;
  run.calls.changed('counter');

  expect(await askedLate(run)).toEqual(standingIn('before'));
  await landed(run, 1, 'after');
  expect(await run.calls.items('counter', input)).toEqual(answered('after'));
  expect(run.sent).toHaveLength(2);
});

it('drops a late answer that lands after a change signal', async () => {
  const run = slotItems();

  await askedLate(run);
  run.calls.changed('counter');
  run.calls.receive(caller, answer(0, 'old'));

  const again = run.calls.items('counter', input);

  expect(run.sent).toHaveLength(2);
  run.calls.receive(caller, answer(1, 'new'));
  expect(await again).toEqual(answered('new'));
});

it("drops a late answer from before a refresh's ask, and keeps that ask's own late answer", async () => {
  const run = slotItems();

  expect(await askedLate(run)).toEqual(leftOutLate);
  run.calls.askAgain('counter', [input]);
  expect(await askedLate(run)).toEqual(leftOutLate);

  const before = run.calls.changes.version;

  run.calls.receive(caller, answer(0, 'old'));
  await settled();
  expect(run.calls.changes.version).toBe(before);

  await landed(run, 1, 'new');
  expect(await run.calls.items('counter', input)).toEqual(answered('new'));
});

it('reaches the open lists with each answer of a Plugin that runs late on every ask', async () => {
  const run = slotItems();

  await askedLate(run);
  await landed(run, 0, 'one');
  expect(await run.calls.items('counter', input)).toEqual(answered('one'));

  run.calls.askAgain('counter', [input]);
  expect(await askedLate(run)).toEqual(standingIn('one'));
  await landed(run, 1, 'two');
  expect(await run.calls.items('counter', input)).toEqual(answered('two'));
});

it('drops an answer that lands after a late call was given up on, and asks again', async () => {
  const run = slotItems();

  await askedLate(run);
  run.clock.fire(slotItemsLateLimitMs);
  await settled();
  run.calls.receive(caller, answer(0, 'too late'));
  await settled();

  const again = run.calls.items('counter', input);

  expect(run.sent).toHaveLength(2);
  run.calls.receive(caller, answer(1, 'fresh'));
  expect(await again).toEqual(answered('fresh'));
});

it('drops a late answer from a worker that has since restarted', async () => {
  const run = slotItems();

  await askedLate(run);
  run.workers.release('counter');
  run.workers.run('counter', 2);
  run.calls.receive(caller, answer(0, 'old'));

  const restarted = run.calls.items('counter', input);

  expect(run.sent).toHaveLength(2);
  run.calls.receive({ pluginId: 'counter', generation: 2 }, answer(1, 'new'));
  expect(await restarted).toEqual(answered('new'));
});
