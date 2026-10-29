import type { RequestPermissionResponse } from '@agentclientprotocol/sdk';
import { permissionOptions, type PendingPermission } from '@repo/contracts';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { expect, onTestFinished } from 'vitest';
import { waitForAcpSnapshot } from './acp-feed';
import { hookRecords } from './hook-plugins';
import type { PermissionJourney } from './native-permission';
import { requireScriptedProcessAt } from './scripted-agent';

const probeId = 'plugin-probe';

type Probe = {
  completion: Promise<void>;
  answers: RequestPermissionResponse[];
};

export async function probeAutoAllow(
  journey: PermissionJourney,
  request: PendingPermission,
): Promise<Probe> {
  const answers: RequestPermissionResponse[] = [];

  const completion = requireScriptedProcessAt(
    journey.host.agent.processes,
    0,
  ).play(probeSteps(answers), 'permission-session');

  void completion.catch(() => {});
  onTestFinished(() => stopProbe(journey, completion));

  await verifyProbe(journey, request);

  return { completion, answers };
}

const probeSteps = (answers: RequestPermissionResponse[]): ScriptedStep[] => [
  probeStarted(),
  permissionRequest(answers),
  probeCompleted(),
];

const probeStarted = (): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'tool_call',
    toolCallId: probeId,
    title: 'Plugin probe',
    status: 'pending',
  },
});

const permissionRequest = (
  answers: RequestPermissionResponse[],
): ScriptedStep => ({
  type: 'permission',
  request: {
    toolCall: { toolCallId: probeId, title: 'Plugin probe' },
    options: permissionOptions,
  },
  responses: answers,
});

const probeCompleted = (): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'tool_call_update',
    toolCallId: probeId,
    status: 'completed',
  },
});

const stopProbe = async (
  journey: PermissionJourney,
  completion: Promise<void>,
): Promise<void> => {
  await journey.host.stop();
  await Promise.allSettled([completion]);
};

const verifyProbe = async (
  journey: PermissionJourney,
  request: PendingPermission,
): Promise<void> => {
  await verifyHook(journey);

  const snapshot = await waitForAcpSnapshot(
    journey.host,
    journey.session.sessionId,
    () => true,
  );

  expect(snapshot.pendingPermission?.requestId).toBe(request.requestId);
};

const verifyHook = async (journey: PermissionJourney): Promise<void> => {
  await expect
    .poll(() => hookRecords(journey.host.home, 'auto-allow'))
    .toMatchObject([
      { name: 'tool.check', event: { request: { toolCallId: probeId } } },
    ]);
};
