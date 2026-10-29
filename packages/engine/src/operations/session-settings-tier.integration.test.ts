import { expect, it } from 'vitest';
import {
  permissionJourney,
  answerPermission,
  permissionRow,
} from '#mocks/native-permission';
import { askOperation } from '#mocks/operation-permissions';
import { beginHeldTurn } from '#mocks/operation-race';
import { runOperation } from '#mocks/operations';

it('applies Settings confirmation to Session tokens and keeps their existing access grant valid after Allow', async () => {
  const journey = await permissionJourney();
  const { host, session } = journey;
  await beginHeldTurn(host, session.sessionId);

  const operation = {
    id: 'agent.setAccess',
    params: { enabled: false },
  } as const;

  const refused = await askOperation(journey, operation);
  await answerPermission(journey, refused.request, 'reject_once');
  expect(await refused.outcome).toMatchObject([
    { status: 'rejected', reason: { message: 'The user refused' } },
  ]);
  expect(await host.caller.agent.getAccess()).toEqual({ enabled: true });
  const allowed = await askOperation(journey, operation);
  await answerPermission(journey, allowed.request, 'allow_once');
  expect(await allowed.outcome).toEqual([
    { status: 'fulfilled', value: { enabled: false } },
  ]);
  expect(await host.caller.agent.getAccess()).toEqual({ enabled: false });
  expect(await permissionRow(journey, allowed.request)).toMatchObject({
    status: 'completed',
    _meta: { argo: { permissionOutcome: { optionId: 'allow_once' } } },
  });
  await expect(
    runOperation(session.caller.operations, { id: 'project.list', params: {} }),
  ).resolves.toEqual(expect.any(Array));
}, 30_000);
