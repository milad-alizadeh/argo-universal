import { expect, it } from 'vitest';
import { signedInRoot, tracker } from './journey-fixture';
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

const observe = async (
  answers: ReturnType<typeof watch>,
  update: (items: unknown[]) => void,
): Promise<void> => {
  for await (const answer of answers) update(itemsOf(answer));
};

it('updates the visible Session row and bar when GitHub closes the attached Issue', async () => {
  const { test, github } = await signedInRoot();
  await attach(test, 'attach');

  const rows = watch(test, rowSlot);
  const bar = watch(test, barSlot);

  let row = itemsOf(
    await until(rows, (answer) =>
      JSON.stringify(itemsOf(answer)).includes('Open'),
    ),
  );

  let line = itemsOf(
    await until(bar, (answer) =>
      JSON.stringify(itemsOf(answer)).includes('Open'),
    ),
  );

  void observe(rows, (items) => {
    row = items;
  });
  void observe(bar, (items) => {
    line = items;
  });

  github.closeIssue(42);
  await test.clock.advance(301_000);

  await expect
    .poll(() => [row, line], { timeout: 2000 })
    .toMatchObject([
      [
        {
          text: '#42',
          tone: 'done',
          tooltip: 'Fixture issue from GitHub · Closed',
        },
      ],
      [{ text: '#42 · Closed' }],
    ]);
}, 20_000);

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
    {
      icon,
      text: '#42 · Open',
      tone: 'success',
      action: { path: issuePage },
    },
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
