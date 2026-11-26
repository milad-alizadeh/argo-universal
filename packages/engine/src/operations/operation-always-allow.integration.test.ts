import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  answerPermission,
  permissionJourney,
  permissionRow,
} from '#mocks/native-permission';
import { askOperation } from '#mocks/operation-permissions';
import { beginHeldTurn } from '#mocks/operation-race';
import { runOperation } from '#mocks/operations';

const setAccess = { id: 'agent.setAccess', params: { enabled: true } } as const;

const grant = {
  projectId: emptySessionInput.projectId,
  operationId: 'agent.setAccess',
};

it('offers Always allow, then runs the Operation without asking until the person revokes it in Settings', async () => {
  const journey = await permissionJourney();
  const { host, session } = journey;
  await beginHeldTurn(host, session.sessionId);

  const asked = await askOperation(journey, setAccess);
  expect(asked.request.options).toContainEqual({
    optionId: 'allow_always',
    name: 'Always allow',
    kind: 'allow_always',
  });
  await answerPermission(journey, asked.request, 'allow_always');
  expect(await asked.outcome).toEqual([
    { status: 'fulfilled', value: { enabled: true } },
  ]);
  expect(await permissionRow(journey, asked.request)).toMatchObject({
    status: 'completed',
    _meta: { argo: { permissionOutcome: { optionId: 'allow_always' } } },
  });
  expect(await host.caller.agent.listGrants()).toEqual([
    expect.objectContaining({ ...grant, label: 'Change Agent access' }),
  ]);

  await expect(
    runOperation(session.caller.operations, { ...setAccess, wait: true }),
  ).resolves.toEqual({ enabled: true });
  expect(
    (await waitForAcpSnapshot(host, session.sessionId, () => true))
      .pendingPermission,
  ).toBeNull();

  await host.caller.agent.revokeGrant(grant);
  expect(await host.caller.agent.listGrants()).toEqual([]);
  const again = await askOperation(journey, setAccess);
  await answerPermission(journey, again.request, 'reject_once');
  expect(await again.outcome).toMatchObject([
    { status: 'rejected', reason: { message: 'The user refused' } },
  ]);
}, 30_000);

it('never lets a Session token list or revoke the grants', async () => {
  const { session } = await permissionJourney();

  for (const id of ['agent.listGrants', 'agent.revokeGrant'] as const)
    await expect(
      runOperation(session.caller.operations, { id, params: grant }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
}, 30_000);
