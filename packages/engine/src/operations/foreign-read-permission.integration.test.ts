import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { permissionJourney } from '#mocks/native-permission';
import { beginHeldTurn } from '#mocks/operation-race';
import { runOperation } from '#mocks/operations';
import { addOtherProject } from '#mocks/session-access';

it('reads another Project’s branches during a Turn', async () => {
  const journey = await permissionJourney();
  const projectId = await addOtherProject(journey.host);
  await beginHeldTurn(journey.host, journey.session.sessionId);

  const operation = {
    id: 'project.listBranches',
    params: { projectId },
  } as const;

  expect(
    await runOperation(journey.session.caller.operations, operation),
  ).toEqual({
    branches: ['feature', 'main'],
    currentBranch: 'main',
  });
}, 30_000);

it('reads an independently started Session in another Project', async () => {
  const journey = await permissionJourney();
  const projectId = await addOtherProject(journey.host);

  const foreign = await journey.host.caller.session.new({
    ...emptySessionInput,
    projectId,
    prompt: [{ type: 'text', text: 'Foreign Session' }],
  });

  await waitForAcpSessionIdle(journey.host, foreign.sessionId);
  await beginHeldTurn(journey.host, journey.session.sessionId);

  await expect(
    runOperation(journey.session.caller.operations, {
      id: 'session.listAgents',
      params: foreign,
    }),
  ).resolves.toEqual([]);
  await expect(
    runOperation(journey.session.caller.operations, {
      id: 'session.list',
      params: { projectId },
    }),
  ).resolves.toMatchObject({ sessions: [foreign], nextCursor: null });
}, 30_000);

it('reads its own Project and unrelated Sessions in that Project without asking, even between Turns', async () => {
  const { session, target } = await permissionJourney();
  await expect(
    runOperation(session.caller.operations, {
      id: 'project.listBranches',
      params: { projectId: 'project-1' },
    }),
  ).resolves.toMatchObject({
    branches: expect.arrayContaining(['feature', 'main']),
    currentBranch: 'main',
  });
  await expect(
    runOperation(session.caller.operations, {
      id: 'session.listAgents',
      params: target,
    }),
  ).resolves.toEqual([]);
  await expect(
    runOperation(session.caller.operations, {
      id: 'agent.getAccess',
      params: {},
    }),
  ).resolves.toEqual({ enabled: true });
}, 30_000);
