import type { RequestPermissionResponse } from '@agentclientprotocol/sdk';
import { permissionOptions, type PendingPermission } from '@repo/contracts';
import { expect, onTestFinished } from 'vitest';
import { waitForAcpSnapshot } from './acp-feed';
import { hookRecords } from './hook-plugins';
import type { PermissionJourney } from './native-permission';
import { requireScriptedProcessAt } from './scripted-agent';

const probeId = 'plugin-probe';

export async function probeAutoAllow(
  journey: PermissionJourney,
  request: PendingPermission,
): Promise<{
  completion: Promise<void>;
  answers: RequestPermissionResponse[];
}> {
  const { host, session } = journey;
  const answers: RequestPermissionResponse[] = [];

  const completion = requireScriptedProcessAt(host.agent.processes, 0).play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'tool_call',
          toolCallId: probeId,
          title: 'Plugin probe',
          status: 'pending',
        },
      },
      {
        type: 'permission',
        request: {
          toolCall: { toolCallId: probeId, title: 'Plugin probe' },
          options: permissionOptions,
        },
        responses: answers,
      },
      {
        type: 'update',
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: probeId,
          status: 'completed',
        },
      },
    ],
    'permission-session',
  );

  void completion.catch(() => {});
  onTestFinished(async () => {
    await host.stop();
    await Promise.allSettled([completion]);
  });

  await expect
    .poll(() => hookRecords(host.home, 'auto-allow'))
    .toMatchObject([
      {
        name: 'tool.check',
        event: { request: { toolCallId: probeId } },
      },
    ]);

  const snapshot = await waitForAcpSnapshot(
    host,
    session.sessionId,
    () => true,
  );

  expect(snapshot.pendingPermission?.requestId).toBe(request.requestId);

  return { completion, answers };
}
