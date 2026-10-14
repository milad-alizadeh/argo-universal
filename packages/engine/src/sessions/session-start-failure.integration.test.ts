import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import { session } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { newSession } from '#mocks/session-journey';
import {
  authRequiredCode,
  type FailedJourney,
  failingAgent,
  internalErrorCode,
  signInFailure,
  startFailedSessionJourney,
} from '#mocks/session-start-failure';

it.each([{ type: 'main' }, { type: 'worktree', baseBranch: 'main' }] as const)(
  'leaves no Session and no worktree when the Agent cannot start in the $type checkout',
  async (checkout): Promise<void> => {
    const { caller, database, git } = await startFailedSessionJourney();
    expect(await caller.agents.recheck({ agentId: failingAgent })).toEqual({
      status: 'ready',
    });
    await expect(
      caller.session.new({ ...newSession, agent: failingAgent, checkout }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining(signInFailure),
    });
    expect(database.select({ id: session.id }).from(session).all()).toEqual([
      { id: 'session-1' },
    ]);
    expect(
      git('worktree', 'list', '--porcelain').match(/^worktree /gm),
    ).toHaveLength(1);
    expect(git('branch', '--list', 'argo/*')).toBe('');
    expect(
      (await caller.projects.list()).find(
        (project) => project.id === 'project-1',
      ),
    ).toMatchObject({
      checkoutChoice: { type: 'worktree', baseBranch: 'main' },
    });
  },
);

// A Checkout that cannot be created fails the Session before the Agent is asked, so its Readiness stands.
const blockWorktrees = ({ git }: FailedJourney): void => {
  writeFileSync(join(git('rev-parse', '--absolute-git-dir'), 'worktrees'), '');
};

const noPreparation = (): void => {};

it.each([
  {
    failure: 'the Agent refuses the Session',
    code: internalErrorCode,
    checkout: { type: 'main' },
    prepare: noPreparation,
    saved: {
      status: 'cant-start',
      reason: expect.stringContaining(signInFailure),
    },
  },
  {
    failure: 'the Agent answers auth_required',
    code: authRequiredCode,
    checkout: { type: 'main' },
    prepare: noPreparation,
    saved: { status: 'sign-in-needed' },
  },
  {
    failure: 'its Checkout cannot be created',
    code: internalErrorCode,
    checkout: { type: 'worktree', baseBranch: 'main' },
    prepare: blockWorktrees,
    saved: { status: 'ready' },
  },
] as const)(
  'saves what a Ready Agent observed when $failure, so only an Agent failure leaves the picker',
  async ({ code, checkout, prepare, saved }): Promise<void> => {
    const journey = await startFailedSessionJourney(code);
    const { caller } = journey;
    await caller.agents.recheck({ agentId: failingAgent });
    prepare(journey);
    await expect(
      caller.session.new({ ...newSession, agent: failingAgent, checkout }),
    ).rejects.toMatchObject({ name: 'TRPCError' });
    await expect
      .poll(async () =>
        (await caller.agents.list()).find(
          ({ agent }) => agent === failingAgent,
        ),
      )
      .toMatchObject(saved);
  },
);

// Closing a Session withdraws its open; that is not the Agent failing.
it('keeps a Ready Agent Ready when its Session is closed while it opens', async (): Promise<void> => {
  const issued: string[] = [];
  const createId = (): string => {
    const id = randomUUID();
    issued.push(id);
    return id;
  };
  const began = Promise.withResolvers<NewSessionRequest>();
  const { caller } = await startAcpEngine(
    {
      steps: [],
      responses: {
        'session/new': [{ received: began, waitFor: new Promise(() => {}) }],
      },
    },
    createId,
  );
  await caller.agents.recheck({ agentId: newSession.agent });
  const sessionIdAt = issued.length;
  const opening = caller.session.new(newSession);
  void opening.catch(() => {});
  await began.promise;
  const closing = caller.session.close({
    sessionId: issued[sessionIdAt] ?? '',
  });
  const [opened] = await Promise.allSettled([opening, closing]);
  expect(opened.status).toBe('rejected');
  expect(
    (await caller.agents.list()).find(
      ({ agent }) => agent === newSession.agent,
    ),
  ).toMatchObject({ status: 'ready' });
});
