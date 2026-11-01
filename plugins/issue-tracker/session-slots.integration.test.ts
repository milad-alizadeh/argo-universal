import { expect, it } from 'vitest';
import { tracker } from './journey-fixture';
import {
  attach,
  barSlot,
  chosenTracker,
  issuePage,
  itemsOf,
  rowSlot,
  trackerWithAttachedIssue,
  until,
  watch,
} from './session-slot-fixture';

const icon = { sf: 'record.circle', material: 'adjust' };

it('fills the Session row with the Issue number once an Agent attaches the Session, and with its state once it loads', async () => {
  const test = await chosenTracker();
  const rows = watch(test, rowSlot);

  expect(itemsOf((await rows.next()).value)).toEqual([]);

  await attach(test, 'attach');

  const loaded = await until(rows, (answer) =>
    JSON.stringify(itemsOf(answer)).includes('success'),
  );

  expect(itemsOf(loaded)).toEqual([
    {
      icon,
      text: '#42',
      tone: 'success',
      tooltip: 'Fixture issue from GitHub · Open',
      action: { path: issuePage },
    },
  ]);
}, 20_000);

it('fills the Session bar with the Issue number and state', async () => {
  const test = await trackerWithAttachedIssue();

  const bar = await until(watch(test, barSlot), (answer) =>
    JSON.stringify(itemsOf(answer)).includes('Open'),
  );

  expect(itemsOf(bar)).toEqual([
    { icon, text: '#42 · Open', action: { path: issuePage } },
  ]);
}, 20_000);

it('leaves the row and the bar empty again once the Session is detached', async () => {
  const test = await trackerWithAttachedIssue();
  const rows = watch(test, rowSlot);
  const bar = watch(test, barSlot);

  await until(rows, (answer) => itemsOf(answer).length === 1);
  await until(bar, (answer) => itemsOf(answer).length === 1);
  await attach(test, 'detach');

  const emptyRow = await until(rows, (answer) => itemsOf(answer).length === 0);
  const emptyBar = await until(bar, (answer) => itemsOf(answer).length === 0);

  expect([itemsOf(emptyRow), itemsOf(emptyBar)]).toEqual([[], []]);
}, 20_000);

it('gives a Session with no Issue no row item and no bar line', async () => {
  const test = await tracker();
  const row = await watch(test, rowSlot).next();
  const bar = await watch(test, barSlot).next();

  expect([itemsOf(row.value), itemsOf(bar.value)]).toEqual([[], []]);
}, 20_000);
