import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  answerPermission,
  permissionJourney,
  permissionRow,
  type PermissionJourney,
} from '#mocks/native-permission';
import { askOperation } from '#mocks/operation-permissions';
import { beginHeldTurn } from '#mocks/operation-race';
import { runOperation } from '#mocks/operations';
import { addOtherProject } from '#mocks/session-access';

const grant = {
  projectId: emptySessionInput.projectId,
  operationId: 'session.schedulePrompt',
  targetProjectId: 'unknown',
};

// A Session in another Project, and the Schedule into it that asks without a grant.
async function scheduleElsewhere({ host }: PermissionJourney): Promise<{
  targetProjectId: string;
  targetSessionId: string;
  schedule: { id: 'session.schedulePrompt'; params: Json };
}> {
  const targetProjectId = await addOtherProject(host);

  const target = await host.caller.session.new({
    ...emptySessionInput,
    projectId: targetProjectId,
    prompt: [{ type: 'text', text: 'Foreign work' }],
  });

  await waitForAcpSessionIdle(host, target.sessionId);

  return {
    targetProjectId,
    targetSessionId: target.sessionId,
    schedule: {
      id: 'session.schedulePrompt',
      params: {
        sessionId: target.sessionId,
        onceAt: 4_102_444_800_000,
        prompt: [{ type: 'text', text: 'Check the build' }],
      },
    },
  };
}

it('offers Always allow on a cross-Project Schedule, then schedules without asking until the person revokes it in Settings', async () => {
  const journey = await permissionJourney();
  const { host, session } = journey;

  const { targetProjectId, targetSessionId, schedule } =
    await scheduleElsewhere(journey);

  const key = { ...grant, targetProjectId };

  await beginHeldTurn(host, session.sessionId);

  const asked = await askOperation(journey, schedule);
  expect(asked.request.options).toContainEqual({
    optionId: 'allow_always',
    name: 'Always allow',
    kind: 'allow_always',
  });
  expect(asked.request.operation?.description).toContain(
    'Always allow lets Sessions started in',
  );
  await answerPermission(journey, asked.request, 'allow_always');
  expect(await asked.outcome).toMatchObject([{ status: 'fulfilled' }]);
  expect(await permissionRow(journey, asked.request)).toMatchObject({
    status: 'completed',
    _meta: { argo: { permissionOutcome: { optionId: 'allow_always' } } },
  });
  expect(await host.caller.agent.listGrants()).toEqual([
    expect.objectContaining({ ...key, label: 'Schedule Prompt' }),
  ]);

  await expect(
    runOperation(session.caller.operations, { ...schedule, wait: true }),
  ).resolves.toMatchObject({ sessionId: targetSessionId });
  expect(
    (await waitForAcpSnapshot(host, session.sessionId, () => true))
      .pendingPermission,
  ).toBeNull();

  await host.caller.agent.revokeGrant(key);
  expect(await host.caller.agent.listGrants()).toEqual([]);
  const again = await askOperation(journey, schedule);
  await answerPermission(journey, again.request, 'reject_once');
  expect(await again.outcome).toMatchObject([
    { status: 'rejected', reason: { message: 'The user refused' } },
  ]);
}, 30_000);

it('offers no Always allow on an Operation that does not opt in', async () => {
  const journey = await permissionJourney();
  await beginHeldTurn(journey.host, journey.session.sessionId);

  const asked = await askOperation(journey, {
    id: 'agent.setAccess',
    params: { enabled: true },
  });

  expect(asked.request.options.map(({ optionId }) => optionId)).toEqual([
    'allow_once',
    'reject_once',
  ]);
  await answerPermission(journey, asked.request, 'reject_once');
}, 30_000);

it('never lets a Session token list or revoke the grants', async () => {
  const { session } = await permissionJourney();

  for (const id of ['agent.listGrants', 'agent.revokeGrant'] as const)
    await expect(
      runOperation(session.caller.operations, { id, params: grant }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
}, 30_000);
