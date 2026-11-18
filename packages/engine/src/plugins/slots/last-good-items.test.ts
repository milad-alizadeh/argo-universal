import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import {
  sessionRowSlotId,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { itemsLeftOut, type ItemsAnswer } from './kept-items';
import { LastGoodItems, lastGoodLimit } from './last-good-items';
import { slotItems } from './slot-items-fixture';

const input: SlotItemsInput = {
  slotId: sessionRowSlotId,
  contexts: [{ sessionId: 'first', projectId: 'argo' }],
};

const caller = { pluginId: 'counter', generation: 1 };

const pull = (id: number): SlotCall => ({
  action: 'items',
  id,
  items: { first: [{ text: 'PR 2304' }] },
});

type Reason = (typeof itemsLeftOut)[keyof typeof itemsLeftOut];

// The Plugin's last good answer, standing in for one left out for this reason.
const standingIn = (reason: Reason): ItemsAnswer => ({
  ok: true,
  items: { first: [{ text: 'PR 2304' }] },
  standingInFor: reason,
});

// A Plugin that answered one pull request for the Session, then was told its items changed.
async function answeredThenChanged(): Promise<ReturnType<typeof slotItems>> {
  const run = slotItems();
  const first = run.calls.items('counter', input);

  run.calls.receive(caller, pull(0));
  await first;
  run.calls.changed('counter');

  return run;
}

it('answers with the last good items when a re-ask after a change runs late', async () => {
  const { calls, clock } = await answeredThenChanged();
  const late = calls.items('counter', input);

  clock.fire();

  expect(await late).toEqual(standingIn(itemsLeftOut.late));
});

it('answers with the last good items when a re-ask after a change throws', async () => {
  const { calls } = await answeredThenChanged();
  const thrown = calls.items('counter', input);

  calls.receive(caller, { action: 'failed', id: 1, error: 'broken' });

  expect(await thrown).toEqual(standingIn(itemsLeftOut.threw));
});

it('answers with the last good items while a restarted Plugin is not running yet', async () => {
  const { calls, workers } = await answeredThenChanged();

  workers.release('counter');

  expect(await calls.items('counter', input)).toEqual(
    standingIn(itemsLeftOut.notRunning),
  );
});

it('lets an answer of no items replace the last good ones', async () => {
  const { calls, clock } = await answeredThenChanged();
  const emptied = calls.items('counter', input);

  calls.receive(caller, { action: 'items', id: 1, items: { first: [] } });
  await emptied;
  calls.changed('counter');

  const late = calls.items('counter', input);

  clock.fire();

  expect(await late).toEqual({ ok: false, reason: itemsLeftOut.late });
});

it('never keeps an answer asked for before a change signal as the last good', async () => {
  const { calls, clock } = slotItems();
  const before = calls.items('counter', input);

  calls.changed('counter');
  calls.receive(caller, pull(0));
  await before;

  const late = calls.items('counter', input);

  clock.fire();

  expect(await late).toEqual({ ok: false, reason: itemsLeftOut.late });
});

it('draws nothing a Plugin answered before once it is turned off or removed', async () => {
  const { calls, workers } = await answeredThenChanged();

  workers.release('counter');
  calls.forget('counter');

  expect(await calls.items('counter', input)).toEqual({
    ok: false,
    reason: itemsLeftOut.notRunning,
  });
});

it('asks open lists again when a Plugin is forgotten', async () => {
  const { calls } = slotItems();
  const before = calls.changes.version;

  calls.forget('counter');

  expect(calls.changes.version).toBeGreaterThan(before);
});

const contextOf = (index: number): SlotItemsInput => ({
  slotId: sessionRowSlotId,
  contexts: [{ sessionId: `s${index}`, projectId: 'argo' }],
});

it(`keeps at most ${lastGoodLimit} contexts per Plugin Slot, dropping the least recently answered`, () => {
  const lastGood = new LastGoodItems();

  for (let index = 0; index <= lastGoodLimit; index += 1)
    lastGood.record('counter', contextOf(index), {
      [`s${index}`]: [{ text: `PR ${index}` }],
    });

  const notRunning = { ok: false, reason: itemsLeftOut.notRunning } as const;

  expect(lastGood.standIn('counter', contextOf(0), notRunning)).toEqual(
    notRunning,
  );
});
