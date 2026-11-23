import { existsSync } from 'node:fs';
import { session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { archiveProjectPath, promptedArchiveSession } from '#mocks/archive';
import { closeTestSession } from '#mocks/close-session';
import {
  newSession,
  sessionJourneyGit,
  startSessionJourney,
} from '#mocks/session-journey';

// A branch deleted or renamed on the server, as the Checkout sees it after a fetch.
type BranchChange = (git: ReturnType<typeof sessionJourneyGit>) => void;

const renameBranch: BranchChange = (git) => {
  git('branch', '-m', 'renamed-on-server');
};

const deleteBranch: BranchChange = (git) => {
  git('update-ref', '-d', `refs/heads/${git('branch', '--show-current')}`);
};

const worktree = { type: 'worktree' as const, baseBranch: 'main' };

it('starts a Session in a new worktree when the base branch was deleted on the server', async () => {
  const host = await startAcpEngine({ steps: [] });
  const git = sessionJourneyGit(archiveProjectPath(host));

  git('branch', 'dev');
  await host.caller.project.update({
    projectId: 'project-1',
    checkoutChoice: { type: 'worktree', baseBranch: 'dev' },
  });
  git('branch', '-D', 'dev');

  const created = await host.caller.session.new({
    ...emptySessionInput,
    checkout: { type: 'worktree', baseBranch: 'dev' },
  });

  const row = host.database
    .select()
    .from(session)
    .where(eq(session.id, created.sessionId))
    .get();

  expect(row && sessionJourneyGit(row.checkoutPath)('rev-parse', 'HEAD')).toBe(
    git('rev-parse', 'main'),
  );
}, 15000);

type ArchivedSession = {
  created: { sessionId: string; path: string };
  read: () => typeof session.$inferSelect | undefined;
};

const archivedRow = async (change: BranchChange): Promise<ArchivedSession> => {
  const host = await startAcpEngine({ steps: [], archiveUndoMs: 100 });
  const created = await promptedArchiveSession(host, worktree);

  change(sessionJourneyGit(created.path));
  await host.caller.session.archive({ sessionId: created.sessionId });

  const read = (): typeof session.$inferSelect | undefined =>
    host.database
      .select()
      .from(session)
      .where(eq(session.id, created.sessionId))
      .get();

  return { created, read };
};

it('archives a Session whose branch was renamed, and removes its worktree', async () => {
  const { created, read } = await archivedRow(renameBranch);

  expect(read()?.archivedAt).not.toBeNull();
  await expect.poll(() => existsSync(created.path)).toBe(false);
}, 15000);

it('archives a Session whose branch was deleted, keeping the worktree Git cannot vouch for', async () => {
  const { created, read } = await archivedRow(deleteBranch);

  expect(read()?.archivedAt).not.toBeNull();
  await expect.poll(() => read()?.keepCheckout).toBe(true);
  expect(existsSync(created.path)).toBe(true);
}, 15000);

// The Checkout the Agent opened, and each cwd it was resumed in after the change.
const resumeAfter = async (
  change: BranchChange,
): Promise<{ cwd: string; resumed: string[] }> => {
  const host = await startSessionJourney();

  const { sessionId } = await host.caller.session.new({
    ...newSession,
    checkout: worktree,
  });

  await expect.poll(() => host.prompts).toHaveLength(1);
  const cwd = host.openings[0]?.cwd ?? '';

  change(sessionJourneyGit(cwd));
  await closeTestSession(host, { sessionId });
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Continue' }],
  });

  await expect.poll(() => host.prompts).toHaveLength(2);

  return { cwd, resumed: host.resumes.map((resume) => resume.cwd) };
};

it.each([
  ['renamed', renameBranch],
  ['deleted', deleteBranch],
])(
  'resumes a Session whose branch was %s',
  async (_, change) => {
    const { cwd, resumed } = await resumeAfter(change);

    expect(resumed).toEqual([cwd]);
  },
  15000,
);
