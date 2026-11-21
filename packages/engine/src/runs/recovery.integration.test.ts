import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { run } from '@repo/db/schema';
import { commandOfProcessGroupLeader } from '@repo/process/group';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { processIsRunning } from '#mocks/shell-process';
import { terminalOwnerToken } from '../lib/terminal-owner';
import { recoverRuns } from './recovery';
import { createRunOutput, runOutputPath } from './run-output';

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
  const { database, directory: home, remove } = openTestDatabase();
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

  await recoverRuns({ database, home, now: () => 9 });

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

it('retains a lost Run’s scratch recording in the shared Blob vault', async () => {
  const { database, directory: home, remove } = openTestDatabase();
  onTestFinished(remove);
  database.insert(run).values(row('recorded', 'ready')).run();

  const scratch = runOutputPath(home, 'recorded');
  const bytes = 'before the Engine restarted\n';
  const blobId = createHash('sha256').update(bytes).digest('hex');

  await createRunOutput(scratch);
  await writeFile(scratch, bytes);
  await recoverRuns({ database, home, now: () => 9 });

  expect(database.select().from(run).get()).toMatchObject({
    status: 'lost',
    outputBlobId: blobId,
  });
  await expect(readFile(join(home, 'blobs', blobId), 'utf8')).resolves.toBe(
    bytes,
  );
  await expect(readFile(scratch)).rejects.toMatchObject({ code: 'ENOENT' });
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

it('kills the process group of a Run it recovers as lost, but never a group that does not carry the Run’s id', async () => {
  const { database, directory: home, remove } = openTestDatabase();
  onTestFinished(remove);
  const ownedToken = terminalOwnerToken('owned');
  const reusedToken = terminalOwnerToken('someone-else');
  const owned = startGroup(ownedToken);
  const reused = startGroup(reusedToken);

  await expect
    .poll(() => commandOfProcessGroupLeader(owned))
    .toContain(ownedToken);
  await expect
    .poll(() => commandOfProcessGroupLeader(reused))
    .toContain(reusedToken);
  database
    .insert(run)
    .values([
      { ...row('owned', 'ready'), pid: owned },
      { ...row('reused', 'ready'), pid: reused },
    ])
    .run();

  await recoverRuns({ database, home, now: () => 9 });

  expect(processIsRunning(owned)).toBe(false);
  expect(processIsRunning(reused)).toBe(true);
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
