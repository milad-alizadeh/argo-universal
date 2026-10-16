import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
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
