import { execFile } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, it, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startWriter } from '#mocks/memory-subagent-feeds';
import { projectPorts } from './project-ports';

const execute = promisify(execFile);

const startedOn = 'argo/session-1';

const identity = ['-c', 'user.name=Test', '-c', 'user.email=test@example.com'];

type Git = (...arguments_: string[]) => Promise<void>;

type StartedSession = {
  ports: ReturnType<typeof projectPorts>;
  git: Git;
  checkoutPath: string;
};

const gitIn =
  (directory: string): Git =>
  async (...arguments_) => {
    await execute('git', ['-C', directory, ...arguments_]);
  };

// A repository on the branch the Session started on, removed when the test finishes.
async function checkoutOnItsBranch(): Promise<string> {
  const checkoutPath = realpathSync(mkdtempSync(join(tmpdir(), 'checkout-')));

  onTestFinished(() => rmSync(checkoutPath, { recursive: true, force: true }));

  const git = gitIn(checkoutPath);

  await git('init', '-q', `--initial-branch=${startedOn}`);
  await git(...identity, 'commit', '-q', '--allow-empty', '-m', 'Initial');

  return checkoutPath;
}

// A Session `session-1` whose Checkout is a repository on the branch it was started on.
async function sessionOnItsBranch(): Promise<StartedSession> {
  const checkoutPath = await checkoutOnItsBranch();

  const stored = openTestDatabase({ checkoutPath, checkoutBranch: startedOn });

  onTestFinished(stored.remove);

  const ports = projectPorts({
    database: stored.database,
    databaseWriter: startWriter(stored.database, stored.directory),
  });

  return { ports, git: gitIn(checkoutPath), checkoutPath };
}

// The GitHub Plugin finds a Session's pull request by this branch, so a branch switched to mid-Session must reach it.
it('tells a Plugin the branch the Session’s Checkout is on now, not the one it started on', async () => {
  const { ports, git } = await sessionOnItsBranch();

  await git('switch', '-q', '-c', 'later-branch');

  expect(await ports.sessionInfo?.('session-1')).toMatchObject({
    projectId: 'project-1',
    branch: 'later-branch',
  });
});

it('tells a Plugin there is no branch while the Checkout is detached', async () => {
  const { ports, git } = await sessionOnItsBranch();

  await git('switch', '-q', '--detach');

  expect(await ports.sessionInfo?.('session-1')).toMatchObject({
    branch: null,
  });
});

it('falls back to the stored branch when the Checkout cannot be read', async () => {
  const { ports, checkoutPath } = await sessionOnItsBranch();

  rmSync(checkoutPath, { recursive: true, force: true });

  expect(await ports.sessionInfo?.('session-1')).toMatchObject({
    branch: startedOn,
  });
});
