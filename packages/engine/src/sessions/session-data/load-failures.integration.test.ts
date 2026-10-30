import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveExecutable } from '@repo/executables';
import { afterEach, expect, it, vi } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { createSessionCheckout } from '../creation/session-create-data';
import { loadSession } from '../session-load';

const newSessionId = 'new-session';

const cleanups: (() => void)[] = [];

const newSession = {
  kind: 'new' as const,
  sessionId: newSessionId,
  turnId: 'turn-1',
  projectId: 'project-1',
  agent: 'mock',
  configOptions: [{ configId: 'model', value: 'large' }],
  prompt: [{ type: 'text' as const, text: 'Build it' }],
};

afterEach((): void => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

it('rejects an unknown Session', async (): Promise<void> => {
  const { database, directory: runtimeDirectory, remove } = openTestDatabase();
  cleanups.push(remove);
  await expect(
    loadSession({
      database,
      runtimeDirectory,
      sessionId: 'missing',
      kind: 'existing',
    }),
  ).rejects.toThrow('No Session missing');
});

it('rejects and reports a git response that has no working Checkout', async (): Promise<void> => {
  const directory = mkdtempSync(join(tmpdir(), 'session-bare-'));
  cleanups.push((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  execFileSync(resolveExecutable('git'), ['init', '--bare', directory]);

  const {
    database,
    directory: runtimeDirectory,
    remove,
  } = openTestDatabase({}, directory);

  cleanups.push(remove);
  const report = vi.spyOn(console, 'error').mockImplementation((): void => {});
  await expect(
    createSessionCheckout({
      ...newSession,
      database,
      runtimeDirectory,
      projectPath: directory,
      checkout: { type: 'main' },
    }),
  ).rejects.toThrow('Unrecognised git worktree list response');
  expect(report).toHaveBeenCalledWith(
    'git: rejected worktree list response #1',
    expect.any(String),
  );
});
