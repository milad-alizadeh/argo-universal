import { expect, it } from 'vitest';
import { signedInRoot, project } from './journey-fixture';
import {
  attach,
  barSlot,
  rowSlot,
  watch,
  until,
  itemsOf,
  issuePage,
} from './session-slot-fixture';

it('refreshes attached Session items after an external closure is read by Issue details', async () => {
  const { test, github } = await signedInRoot();
  await attach(test, 'attach');
  await until(watch(test, rowSlot), (answer) =>
    JSON.stringify(itemsOf(answer)).includes('Open'),
  );
  await until(watch(test, barSlot), (answer) =>
    JSON.stringify(itemsOf(answer)).includes('Open'),
  );
  const page = await test.pages.open({ path: issuePage });
  github.closeIssue(42);
  await test.operations.run({
    name: 'checkAgain',
    params: {},
    caller: { projectId: project.id },
  });
  await page.draw();
  expect(page.findText('Reopen Issue')).toBeDefined();

  const row = await until(watch(test, rowSlot), (answer) =>
    JSON.stringify(itemsOf(answer)).includes('Closed'),
  );

  const bar = await until(watch(test, barSlot), (answer) =>
    JSON.stringify(itemsOf(answer)).includes('Closed'),
  );

  expect(itemsOf(row)).toMatchObject([{ tone: 'done' }]);
  expect(itemsOf(bar)).toMatchObject([{ tone: 'done', text: '#42 · Closed' }]);
}, 20_000);
