import { execFile } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { archiveProjectPath, promptedArchiveSession } from '#mocks/archive';
import { startEngineTestHost } from '#mocks/engine';

it('serves after one archived Checkout fails cleanup, removes the others, and retries the failure on a later restart', async () => {
  const host = await startAcpEngine({ steps: [] });
  const locked = await promptedArchiveSession(host);
  const removable = await promptedArchiveSession(host);
  const projectPath = archiveProjectPath(host);
  await promisify(execFile)('git', [
    '-C',
    projectPath,
    'worktree',
    'lock',
    locked.path,
  ]);
  await host.caller.session.archive({ sessionId: locked.sessionId });
  await host.caller.session.archive({ sessionId: removable.sessionId });
  await host.stop();

  const restarted = await startEngineTestHost({ home: host.home });
  expect(existsSync(locked.path)).toBe(true);
  expect(existsSync(removable.path)).toBe(false);
  expect(existsSync(projectPath)).toBe(true);
  expect(
    (await restarted.caller.session.list({ archived: true })).sessions,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sessionId: locked.sessionId }),
      expect.objectContaining({ sessionId: removable.sessionId }),
    ]),
  );
  await restarted.stop();

  await promisify(execFile)('git', [
    '-C',
    projectPath,
    'worktree',
    'unlock',
    locked.path,
  ]);
  const recovered = await startEngineTestHost({ home: host.home });
  expect(existsSync(locked.path)).toBe(false);
  expect(existsSync(projectPath)).toBe(true);
  await recovered.stop();
}, 15000);

it('preserves work written during Undo after restart and records why in the archived Feed', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { path, ...session } = await promptedArchiveSession(host);

  await expect(host.caller.session.archive(session)).resolves.toEqual({});
  writeFileSync(join(path, 'new-source.ts'), 'export const kept = true;');
  await host.stop();

  const restarted = await startEngineTestHost({ home: host.home });
  expect(readFileSync(join(path, 'new-source.ts'), 'utf8')).toBe(
    'export const kept = true;',
  );
  expect(await restarted.caller.session.get(session)).toMatchObject({
    archivedAt: expect.any(Number),
  });
  expect(
    (await restarted.caller.feed.page({ ...session, direction: 'tail' })).rows,
  ).toContainEqual(
    expect.objectContaining({
      sessionUpdate: 'notice',
      title: 'Checkout kept',
    }),
  );
}, 15_000);

const source = 'source.ts';

const sourceContents = 'export const saved = true;';

async function committedCheckout(detached = false): Promise<{
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  path: string;
  session: { sessionId: string };
}> {
  const host = await startAcpEngine({ steps: [] });
  const { path, ...session } = await promptedArchiveSession(host);

  if (detached) await gitAt(path, 'checkout', '--detach');
  writeFileSync(join(path, source), sourceContents);
  await gitAt(path, 'add', source);
  await gitAt(
    path,
    '-c',
    'user.email=test@example.org',
    '-c',
    'user.name=Test',
    'commit',
    '-m',
    'Save work',
  );

  return { host, path, session };
}

async function gitAt(path: string, ...args: string[]): Promise<void> {
  await promisify(execFile)('git', ['-C', path, ...args]);
}

it('asks before cleanup would leave a detached commit unreachable', async () => {
  const { host, session } = await committedCheckout(true);

  expect(
    (await host.caller.session.archive(session)).checkoutConfirmation?.reason,
  ).toContain('unreachable');
  expect((await host.caller.session.get(session)).archivedAt).toBeNull();
}, 15_000);

it.each([false, true])(
  'keeps the Checkout only if reachable committed work has a hidden edit (%s)',
  async (hidden) => {
    const { host, path, session } = await committedCheckout();

    if (hidden) {
      await gitAt(path, 'update-index', '--assume-unchanged', source);
      writeFileSync(join(path, source), 'export const saved = false;');
    }

    expect(await host.caller.session.archive(session)).toEqual({});
    await host.stop();
    await startEngineTestHost({ home: host.home });
    expect(existsSync(path)).toBe(hidden);
  },
  15_000,
);
