import { run } from '@repo/db/schema';
import { expect, it, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { recoverRuns } from './recovery';

type Status = 'starting' | 'ready' | 'stopped' | 'crashed';

const row = (id: string, status: Status): typeof run.$inferInsert => ({
  id,
  projectId: 'project-1',
  checkoutPath: '/project',
  name: id,
  command: 'pnpm dev',
  cwd: '.',
  port: 4100,
  url: 'http://localhost:4100',
  pid: null,
  status,
  exitCode: status === 'crashed' ? 2 : null,
  startedAt: 1,
  readyAt: null,
  endedAt: null,
});

it('marks Runs a crash left running as lost, and leaves finished ones as they were', async () => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);

  database
    .insert(run)
    .values([
      row('starting', 'starting'),
      row('ready', 'ready'),
      row('stopped', 'stopped'),
      row('crashed', 'crashed'),
    ])
    .run();

  await recoverRuns({ database, now: () => 9 });

  expect(
    database
      .select()
      .from(run)
      .all()
      .map(({ id, status, exitCode, endedAt }) => [
        id,
        status,
        exitCode,
        endedAt,
      ])
      .toSorted((a, b) => String(a[0]).localeCompare(String(b[0]))),
  ).toEqual([
    ['crashed', 'crashed', 2, null],
    ['ready', 'lost', null, 9],
    ['starting', 'lost', null, 9],
    ['stopped', 'stopped', null, null],
  ]);
});
