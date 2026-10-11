import { turn } from '@repo/db/schema';
import { sessionBranch } from '@repo/git';
import { eq } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import { startSessionJourney, newSession } from '#mocks/session-journey';

it('creates the Checkout, starts the Agent with the chosen options and runs the first Turn in one call', async (): Promise<void> => {
  const { caller, openings, database, prompts, settings } =
    await startSessionJourney();
  const { sessionId } = await caller.session.new({
    ...newSession,
    checkout: { type: 'worktree', baseBranch: 'feature' },
  });
  expect(settings).toEqual([
    { sessionId: 'owned-1', configId: 'model', value: 'large' },
  ]);
  await expect
    .poll(() => prompts)
    .toEqual([{ sessionId: 'owned-1', prompt: newSession.prompt }]);
  expect(openings[0]?.cwd).toEqual(expect.stringContaining(sessionId));
  expect(
    (await caller.feed.page({ sessionId, direction: 'tail' })).rows,
  ).toEqual([
    expect.objectContaining({
      sessionUpdate: 'user_message',
      content: newSession.prompt,
    }),
  ]);
  expect(
    (await caller.session.list({ archived: false })).sessions,
  ).toContainEqual(
    expect.objectContaining({
      sessionId,
      agent: 'mock',
      title: 'Build it',
      titleSource: 'prompt',
      checkout: {
        type: 'worktree',
        path: expect.stringContaining(sessionId),
        branch: sessionBranch(sessionId),
      },
    }),
  );
  await vi.waitFor((): void =>
    expect(
      database.select().from(turn).where(eq(turn.sessionId, sessionId)).all(),
    ).toEqual([expect.objectContaining({ status: 'running', model: 'large' })]),
  );
  expect(
    (await caller.projects.list()).find(
      (project) => project.id === 'project-1',
    ),
  ).toMatchObject({
    checkoutChoice: { type: 'worktree', baseBranch: 'feature' },
  });
});
