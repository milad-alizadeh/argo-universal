import { spawn } from 'node:child_process';
import { run } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { recoverRuns } from './recovery';
import { runToken } from './run-processes';

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

// A real process group, as a Run's terminal leads one: its shell's `$0` carries the token.
const startGroup = (token: string): number => {
  const child = spawn('/bin/sh', ['-c', 'sleep 60', token], {
    detached: true,
    stdio: 'ignore',
  });

  const { pid } = child;

  if (pid === undefined) throw new Error('No process started');
  onTestFinished(() => {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      // Already killed by recovery.
    }
  });

  return pid;
};

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
};

const gone = async (pid: number): Promise<boolean> => {
  await expect.poll(() => alive(pid), { timeout: 5000 }).toBe(false);

  return true;
};

it('kills the process group of a Run it recovers as lost, but never a group that does not carry the Run’s id', async () => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  const owned = startGroup(runToken('owned'));
  const reused = startGroup(runToken('someone-else'));

  database
    .insert(run)
    .values([
      { ...row('owned', 'ready'), pid: owned },
      { ...row('reused', 'ready'), pid: reused },
    ])
    .run();

  await recoverRuns({ database, now: () => 9 });

  expect(await gone(owned)).toBe(true);
  expect(alive(reused)).toBe(true);
  expect(
    database.select().from(run).where(eq(run.id, 'reused')).get(),
  ).toMatchObject({ status: 'lost' });
});

it('recovers leftover Runs when the Engine starts', async () => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  database.insert(run).values(row('left', 'ready')).run();

  const host = await startEngineTestHost({ database });

  expect(
    host.database.select().from(run).where(eq(run.id, 'left')).get(),
  ).toMatchObject({ status: 'lost', exitCode: null });
});
