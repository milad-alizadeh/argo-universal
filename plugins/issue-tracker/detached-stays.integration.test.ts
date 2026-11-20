import { expect, it } from 'vitest';
import { project } from './journey-fixture';
import {
  attach,
  itemsOf,
  rowSlot,
  trackerWithAttachedIssue,
  until,
  watch,
} from './session-slot-fixture';

it('keeps a detached Issue off the row when the Agent attaches it again, until the person asks', async () => {
  const test = await trackerWithAttachedIssue();
  const rows = watch(test, rowSlot);

  await until(rows, (answer) => itemsOf(answer).length === 1);
  await attach(test, 'detach');
  await until(rows, (answer) => itemsOf(answer).length === 0);

  await expect(attach(test, 'attach')).rejects.toThrow(
    /detached from this Session/,
  );

  await test.operations.run({
    name: 'attach',
    params: { number: 42, again: true },
    caller: { sessionId: 'session-1', projectId: project.id },
  });

  const back = await until(rows, (answer) => itemsOf(answer).length === 1);

  expect(itemsOf(back)).toHaveLength(1);
}, 20_000);
