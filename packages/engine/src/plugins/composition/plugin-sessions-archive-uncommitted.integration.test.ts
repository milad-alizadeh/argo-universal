import { execFile } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { assert, expect, it } from 'vitest';
import { promptedArchiveSession } from '#mocks/archive';
import {
  archiveFor,
  archivedAt,
  canArchive,
  startWith,
} from '#mocks/plugin-archive-host';

const run = promisify(execFile);

const identity = ['-c', 'user.name=Test', '-c', 'user.email=test@example.com'];

const gitIn = async (checkout: string, ...args: string[]): Promise<void> => {
  await run('git', ['-C', checkout, ...identity, ...args]);
};

const uncommitted = /uncommitted files/;

it('refuses an archive while the Checkout has an untracked file, then archives once it is removed', async () => {
  const host = await startWith(canArchive);
  const created = await promptedArchiveSession(host);
  const file = join(created.path, 'draft.txt');

  writeFileSync(file, 'unsaved');

  await expect(archiveFor(host, created.sessionId)).rejects.toThrow(
    uncommitted,
  );
  expect(archivedAt(host, created.sessionId)).toBeNull();

  await gitIn(created.path, 'add', 'draft.txt');
  await expect(archiveFor(host, created.sessionId)).rejects.toThrow(
    uncommitted,
  );

  await gitIn(created.path, 'commit', '-q', '-m', 'Save');
  await expect(archiveFor(host, created.sessionId)).resolves.toEqual({
    result: { archived: created.sessionId },
  });
  expect(archivedAt(host, created.sessionId)).toBeTypeOf('number');
}, 30_000);

it('refuses a Plugin archive of tracked edits and lets the person approve it', async () => {
  const host = await startWith(canArchive);
  const created = await promptedArchiveSession(host);
  const file = join(created.path, 'tracked.txt');

  writeFileSync(file, 'one');
  await gitIn(created.path, 'add', 'tracked.txt');
  await gitIn(created.path, 'commit', '-q', '-m', 'Track');
  writeFileSync(file, 'two');

  await expect(archiveFor(host, created.sessionId)).rejects.toThrow(
    uncommitted,
  );
  expect(archivedAt(host, created.sessionId)).toBeNull();

  const { checkoutConfirmation } = await host.caller.session.archive({
    sessionId: created.sessionId,
  });

  assert(checkoutConfirmation);
  await host.caller.session.archive({
    sessionId: created.sessionId,
    checkoutApproval: checkoutConfirmation.fingerprint,
  });
  expect(archivedAt(host, created.sessionId)).toBeTypeOf('number');
}, 30_000);
