import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { permissionJourney, answerPermission } from '#mocks/native-permission';
import { askOperation } from '#mocks/operation-permissions';
import { beginHeldTurn } from '#mocks/operation-race';
import { addOtherProject } from '#mocks/session-access';

it('reads another Project only after Permission, preserving refusal and result shapes', async () => {
  const journey = await permissionJourney();
  const projectId = await addOtherProject(journey.host);
  await beginHeldTurn(journey.host, journey.session.sessionId);

  const operation = {
    id: 'project.listBranches',
    params: { projectId },
  } as const;

  const refused = await askOperation(journey, operation);
  await answerPermission(journey, refused.request, 'reject_once');
  expect(await refused.outcome).toMatchObject([
    { status: 'rejected', reason: { message: 'The user refused' } },
  ]);
  const allowed = await askOperation(journey, operation);
  await answerPermission(journey, allowed.request, 'allow_once');
  expect(await allowed.outcome).toEqual([
    {
      status: 'fulfilled',
      value: { branches: ['feature', 'main'], currentBranch: 'main' },
    },
  ]);
}, 30_000);

it('resolves a Session read’s Project before asking for foreign access', async () => {
  const journey = await permissionJourney();
  const projectId = await addOtherProject(journey.host);

  const foreign = await journey.host.caller.session.new({
    ...emptySessionInput,
    projectId,
    prompt: [{ type: 'text', text: 'Foreign Session' }],
  });

  await waitForAcpSessionIdle(journey.host, foreign.sessionId);
  await beginHeldTurn(journey.host, journey.session.sessionId);

  const asked = await askOperation(journey, {
    id: 'session.listAgents',
    params: foreign,
  });

  await answerPermission(journey, asked.request, 'allow_once');
  expect(await asked.outcome).toEqual([{ status: 'fulfilled', value: [] }]);

  const list = await askOperation(journey, {
    id: 'session.list',
    params: { projectId },
  });

  await answerPermission(journey, list.request, 'allow_once');
  expect(await list.outcome).toMatchObject([
    { status: 'fulfilled', value: { sessions: [foreign], nextCursor: null } },
  ]);
}, 30_000);

it('reads its own Project and unrelated Sessions in that Project without asking, even between Turns', async () => {
  const { session, target } = await permissionJourney();
  await expect(
    session.caller.operations.run.mutate({
      id: 'project.listBranches',
      params: { projectId: 'project-1' },
    }),
  ).resolves.toEqual({ branches: ['feature', 'main'], currentBranch: 'main' });
  await expect(
    session.caller.operations.run.mutate({
      id: 'session.listAgents',
      params: target,
    }),
  ).resolves.toEqual([]);
  await expect(
    session.caller.operations.run.mutate({ id: 'agent.getAccess', params: {} }),
  ).resolves.toEqual({ enabled: true });
}, 30_000);
