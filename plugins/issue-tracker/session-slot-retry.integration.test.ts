import { expect, it } from 'vitest';
import { signedInRoot } from './journey-fixture';
import {
  advancedUntil,
  attach,
  barSlot,
  issuePage,
  itemsOf,
  until,
  watch,
} from './session-slot-fixture';

const detach = { operation: 'detach', args: { number: 42 } };

const icon = { sf: 'record.circle', material: 'adjust' };

it('draws the Issue state once GitHub answers again after the first read failed', async () => {
  const { test, github } = await signedInRoot();
  const bar = watch(test, barSlot);

  github.down(true);
  await attach(test, 'attach');

  const unloaded = await until(bar, (answer) => itemsOf(answer).length === 1);

  expect(itemsOf(unloaded)).toEqual([
    { icon, text: '#42', action: { path: issuePage }, detach },
  ]);

  github.down(false);

  const { answer, movedMs } = await advancedUntil(test, bar, (next) =>
    JSON.stringify(itemsOf(next)).includes('Open'),
  );

  // Well inside the 5-minute refresh, which would otherwise be the first to ask again.
  expect(movedMs).toBeLessThanOrEqual(30_000);
  expect(itemsOf(answer)).toEqual([
    {
      icon,
      text: '#42 · Open',
      tone: 'success',
      action: { path: issuePage },
      detach,
    },
  ]);
}, 20_000);
