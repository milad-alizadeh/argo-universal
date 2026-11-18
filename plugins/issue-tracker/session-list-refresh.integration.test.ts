import { expect, it } from 'vitest';
import { signedInRoot } from './journey-fixture';
import { attach, rowSlot, watch, until, itemsOf } from './session-slot-fixture';

it('refreshes the visible Session list Issue without opening its page or changing the Session', async () => {
  const { test, github } = await signedInRoot();
  await attach(test, 'attach');
  const rows = watch(test, rowSlot);
  let row = itemsOf(
    await until(rows, (answer) =>
      JSON.stringify(itemsOf(answer)).includes('Open'),
    ),
  );
  void (async () => {
    for await (const answer of rows) row = itemsOf(answer);
  })();
  github.closeIssue(42);
  await test.clock.advance(31_000);
  await expect
    .poll(() => row, { timeout: 2000 })
    .toMatchObject([
      {
        text: '#42',
        tone: 'done',
        tooltip: 'Fixture issue from GitHub · Closed',
      },
    ]);
}, 20_000);
