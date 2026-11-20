import { existsSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import { sessionBranch } from '@repo/git';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { operationCaller, runOperation } from '#mocks/operations';
import {
  delegationJourney,
  holdSession,
  startDelegated,
} from '#mocks/session-delegation';

const worktree = { type: 'worktree' as const, baseBranch: 'main' };

const starter = { type: 'starter' as const };

// A short Undo window, after which an owned worktree is removed.
const archiveUndoMs = 500;

const startInStarterCheckout = {
  id: 'session.new' as const,
  params: { ...emptySessionInput, checkout: starter },
};

it("starts a Session in its starter's worktree, on the starter's branch", async () => {
  const journey = await delegationJourney({ checkout: worktree });
  const started = await startDelegated(journey, journey.caller, starter);

  const { checkout } = await journey.host.caller.session.get({
    sessionId: journey.caller.sessionId,
  });

  expect(checkout).toMatchObject({
    type: 'worktree',
    branch: sessionBranch(journey.caller.sessionId),
  });
  expect(
    await journey.host.caller.session.get({ sessionId: started.sessionId }),
  ).toMatchObject({
    startedBySessionId: journey.caller.sessionId,
    checkout: { ...checkout, type: 'starter' },
  });
});

it("starts a Session in the main checkout when its starter runs there, and leaves the Project's own choice alone", async () => {
  const journey = await delegationJourney();
  await journey.host.caller.project.update({
    projectId: emptySessionInput.projectId,
    checkoutChoice: worktree,
  });
  const started = await startDelegated(journey, journey.caller, starter);

  const { checkout } = await journey.host.caller.session.get({
    sessionId: journey.caller.sessionId,
  });

  expect(
    await journey.host.caller.session.get({ sessionId: started.sessionId }),
  ).toMatchObject({ checkout: { ...checkout, type: 'main' } });
  expect(
    (await journey.host.caller.project.list()).find(
      ({ id }) => id === emptySessionInput.projectId,
    ),
  ).toMatchObject({ checkoutChoice: worktree });
});

it("refuses the starter's Checkout to a caller that is not a Session", async () => {
  const journey = await delegationJourney();
  const user = await operationCaller(journey.host);

  await expect(
    runOperation(user.operations, startInStarterCheckout),
  ).rejects.toMatchObject({
    data: { code: 'BAD_REQUEST' },
    message: "Only a Session can start a Session in its starter's Checkout",
  });
  await expect(
    journey.host.caller.session.new(startInStarterCheckout.params),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});

it("archives a Session that borrowed its starter's worktree without removing it", async () => {
  const journey = await delegationJourney({
    checkout: worktree,
    agent: { archiveUndoMs },
  });

  const started = await startDelegated(journey, journey.caller, starter);

  const { checkout } = await journey.host.caller.session.get({
    sessionId: started.sessionId,
  });

  await journey.host.caller.session.archive({ sessionId: started.sessionId });
  await setTimeout(archiveUndoMs + 500);

  expect(existsSync(checkout.path)).toBe(true);
  expect(
    await journey.host.caller.session.get({
      sessionId: journey.caller.sessionId,
    }),
  ).toMatchObject({ archivedAt: null });
}, 15_000);

it('archives the Sessions that borrowed a worktree with the Session that owns it, and Undo restores them together', async () => {
  const journey = await delegationJourney({ checkout: worktree });
  const started = await startDelegated(journey, journey.caller, starter);
  const owner = { sessionId: journey.caller.sessionId };

  await journey.host.caller.session.archive(owner);
  expect(
    await journey.host.caller.session.get({ sessionId: started.sessionId }),
  ).toMatchObject({ archivedAt: expect.any(Number) });
  await journey.host.caller.session.unarchive(owner);
  expect(
    await journey.host.caller.session.get({ sessionId: started.sessionId }),
  ).toMatchObject({ archivedAt: null });
}, 20_000);

it('refuses to archive a worktree while a Session that borrowed it runs a Turn', async () => {
  const journey = await delegationJourney({ checkout: worktree });
  const started = await startDelegated(journey, journey.caller, starter);
  const owner = { sessionId: journey.caller.sessionId };

  await holdSession(journey, started.sessionId);
  await expect(
    journey.host.caller.session.archive(owner),
  ).rejects.toMatchObject({
    code: 'CONFLICT',
    message: 'A Session that borrowed this Checkout is running a Turn',
  });
  expect(await journey.host.caller.session.get(owner)).toMatchObject({
    archivedAt: null,
  });
});
