import { execFile } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { emptyPromptQueue, type PromptQueue } from '@repo/contracts';
import { session, turn } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startWriter } from '#mocks/memory-subagent-feeds';
import { projectPorts } from './project-ports';
import { sessionInfoKeptMs } from './session-info-cache';

const firstSession = 'session-1';

const laterBranch = 'later-branch';

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
async function sessionOnItsBranch(now?: () => number): Promise<StartedSession> {
  const checkoutPath = await checkoutOnItsBranch();

  const stored = openTestDatabase({ checkoutPath, checkoutBranch: startedOn });

  onTestFinished(stored.remove);

  const ports = projectPorts({
    database: stored.database,
    databaseWriter: startWriter(stored.database, stored.directory),
    now,
  });

  return { ports, git: gitIn(checkoutPath), checkoutPath };
}

// The GitHub Plugin finds a Session's pull request by this branch, so a branch switched to mid-Session must reach it.
it('tells a Plugin the branch the Session’s Checkout is on now, not the one it started on', async () => {
  const { ports, git } = await sessionOnItsBranch();

  await git('switch', '-q', '-c', laterBranch);

  expect(await ports.sessionInfo?.(firstSession)).toMatchObject({
    projectId: 'project-1',
    branch: laterBranch,
  });
});

it('tells a Plugin there is no branch while the Checkout is detached', async () => {
  const { ports, git } = await sessionOnItsBranch();

  await git('switch', '-q', '--detach');

  expect(await ports.sessionInfo?.(firstSession)).toMatchObject({
    branch: null,
  });
});

it('falls back to the stored branch when the Checkout cannot be read', async () => {
  const { ports, checkoutPath } = await sessionOnItsBranch();

  rmSync(checkoutPath, { recursive: true, force: true });

  expect(await ports.sessionInfo?.(firstSession)).toMatchObject({
    branch: startedOn,
  });
});

// A redraw asks for the same Session again and again; the Checkout is asked once until the answer is old.
it('answers a repeat sessions.get from core without asking the Checkout again, until the answer is old', async () => {
  let clock = 0;

  const { ports, git } = await sessionOnItsBranch(() => clock);

  const branchNow = async (): Promise<string | null | undefined> =>
    (await ports.sessionInfo?.(firstSession))?.branch;

  expect(await branchNow()).toBe(startedOn);

  await git('switch', '-q', '-c', laterBranch);

  expect(await branchNow()).toBe(startedOn);

  clock += sessionInfoKeptMs;

  expect(await branchNow()).toBe(laterBranch);
});

const now = 1_800_000_000_000;

const minutes = (count: number): number => count * 60_000;

// The Session's last Feed change, and what its queue holds.
function sessionState(
  stored: ReturnType<typeof openTestDatabase>,
  state: { activityAt: number; promptQueue?: PromptQueue },
): void {
  stored.database
    .update(session)
    .set({
      activityAt: state.activityAt,
      promptQueue: state.promptQueue ?? emptyPromptQueue(),
    })
    .where(eq(session.id, 'session-1'))
    .run();
}

function addTurn(
  stored: ReturnType<typeof openTestDatabase>,
  values: { status: 'running' | 'ended'; startedAt: number; endedAt?: number },
): void {
  stored.database
    .insert(turn)
    .values({
      id: `turn-${values.startedAt}`,
      sessionId: 'session-1',
      ...values,
    })
    .run();
}

async function idleSession(): Promise<{
  ports: ReturnType<typeof projectPorts>;
  stored: ReturnType<typeof openTestDatabase>;
}> {
  vi.useFakeTimers({ toFake: ['Date'], now });
  onTestFinished(() => {
    vi.useRealTimers();
  });

  const checkoutPath = await checkoutOnItsBranch();
  const stored = openTestDatabase({ checkoutPath, checkoutBranch: startedOn });

  onTestFinished(stored.remove);

  const ports = projectPorts({
    database: stored.database,
    databaseWriter: startWriter(stored.database, stored.directory),
  });

  return { ports, stored };
}

// Auto-fix prompts again when CI is still red and the Session has sat idle (ADR-0055).
it('tells a Plugin how long a Session has had nothing happen since its last Turn ended', async () => {
  const { ports, stored } = await idleSession();

  sessionState(stored, { activityAt: now - minutes(40) });
  addTurn(stored, {
    status: 'ended',
    startedAt: now - minutes(50),
    endedAt: now - minutes(31),
  });

  expect((await ports.sessionInfo?.('session-1'))?.idleFor).toBe(minutes(31));
});

it('tells a Plugin a Session is not idle while a Turn runs', async () => {
  const { ports, stored } = await idleSession();

  sessionState(stored, { activityAt: now - minutes(40) });
  addTurn(stored, { status: 'running', startedAt: now - minutes(35) });

  expect((await ports.sessionInfo?.('session-1'))?.idleFor).toBeNull();
});

it('tells a Plugin a Session is not idle while its queue is paused', async () => {
  const { ports, stored } = await idleSession();

  sessionState(stored, {
    activityAt: now - minutes(40),
    promptQueue: { items: [], pauseReason: 'The Turn failed' },
  });

  expect((await ports.sessionInfo?.('session-1'))?.idleFor).toBeNull();
});
