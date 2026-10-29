import type {
  CreateElicitationResponse,
  RequestPermissionResponse,
} from '@agentclientprotocol/sdk';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import {
  permissionSteps,
  elicitationSteps,
} from './acp-requests-scenarios.test.mocks';
import {
  allowOnce,
  alreadyAnswered,
  issueMessage,
  cancelled,
  promptSession,
  waitForPermission,
  waitForElicitation,
  waitForTurnEnd,
} from './acp-requests-shared.test.mocks';

type Kind = 'Permission' | 'Elicitation';

const stepsFor = (
  kind: Kind,
  permission: RequestPermissionResponse[],
  elicitation: CreateElicitationResponse[],
): ReturnType<typeof permissionSteps> =>
  kind === 'Permission'
    ? permissionSteps(permission, ['tool-a'])
    : elicitationSteps(elicitation, [issueMessage]);

const responseFor = (
  kind: Kind,
  permission: RequestPermissionResponse[],
  elicitation: CreateElicitationResponse[],
): RequestPermissionResponse | CreateElicitationResponse | undefined =>
  kind === 'Permission' ? permission[0] : elicitation[0];

const cancelledOutcome = (
  kind: Kind,
): typeof cancelled | { action: 'cancel' } =>
  kind === 'Permission' ? cancelled : { action: 'cancel' };

it.each(
  appFixtureAgentIds.flatMap((agent) =>
    (['Permission', 'Elicitation'] as const).map((kind) => ({ agent, kind })),
  ),
)(
  '$agent Stop cancels a pending $kind, refuses late answers and ends its Turn',
  async ({ agent, kind }) => {
    const permissionResponses: RequestPermissionResponse[] = [];
    const elicitationResponses: CreateElicitationResponse[] = [];

    const host = await startAcpEngine(
      {
        steps: [
          ...stepsFor(kind, permissionResponses, elicitationResponses),
          { type: 'wait-for-cancel' },
        ],
      },
      undefined,
      agent,
    );

    const { sessionId } = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });

    await promptSession(host, sessionId);

    const pending = await (kind === 'Permission'
      ? waitForPermission(host, sessionId)
      : waitForElicitation(host, sessionId));

    await host.caller.session.cancel({ sessionId });
    await waitForTurnEnd(host, sessionId);
    expect(
      responseFor(kind, permissionResponses, elicitationResponses),
    ).toEqual(cancelledOutcome(kind));
    await expect(
      kind === 'Permission'
        ? host.caller.session.answerPermission({
            sessionId,
            requestId: pending.requestId,
            optionId: allowOnce,
          })
        : host.caller.session.answerElicitation({
            sessionId,
            requestId: pending.requestId,
            action: 'decline',
          }),
    ).rejects.toThrow(alreadyAnswered);
    const snapshot = await waitForTurnEnd(host, sessionId);
    expect(snapshot.pendingPermission).toBeNull();
    expect(snapshot.pendingElicitation).toBeNull();
  },
);
