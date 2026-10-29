import type { RequestPermissionResponse } from '@agentclientprotocol/sdk';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it, vi } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import {
  permissionSteps,
  readToolCallUpdate,
} from './acp-requests-scenarios.test.mocks';
import {
  type Outcomes,
  allowOnce,
  alreadyAnswered,
  editToolTitle,
  cancelled,
  exactOptions,
  startSession,
  waitForPermission,
  waitForTurnEnd,
} from './acp-requests-shared.test.mocks';

describe.each(appFixtureAgentIds)('%s Permission requests', (agent) => {
  it('an option the Agent did not offer is refused and the request stays pending', async () => {
    const { host, sessionId } = await startSession(
      agent,
      permissionSteps([], ['tool-a']),
    );

    const pending = await waitForPermission(host, sessionId);
    await expect(
      host.caller.session.answerPermission({
        sessionId,
        requestId: pending.requestId,
        optionId: 'allow_once',
      }),
    ).rejects.toThrow('did not offer');
    expect(await waitForPermission(host, sessionId)).toEqual(pending);
  });

  it('a request stays answerable after one App stops watching the Session', async () => {
    const outcomes: Outcomes = [];

    const { host, sessionId } = await startSession(
      agent,
      permissionSteps(outcomes, ['tool-a']),
    );

    const pending = await waitForPermission(host, sessionId);
    const departingApp = host.createCaller();

    const watching = (
      await departingApp.feed.subscribe({ sessionId, after: null })
    )[Symbol.asyncIterator]();

    await watching.next();
    await watching.return?.();
    await host.createCaller().session.answerPermission({
      sessionId,
      requestId: pending.requestId,
      optionId: allowOnce,
    });
    await waitForAcpSessionIdle(host, sessionId);
    expect(outcomes[0]?.outcome).toEqual({
      outcome: 'selected',
      optionId: allowOnce,
    });
  });

  it('a request still pending when its Turn ends is cancelled and no longer answerable', async () => {
    const responses: RequestPermissionResponse[] = [];
    const finish = Promise.withResolvers<void>();

    const { host, sessionId } = await startSession(agent, [
      {
        type: 'update',
        update: {
          sessionUpdate: 'tool_call',
          toolCallId: 'tool-a',
          title: editToolTitle,
        },
      },
      {
        type: 'permission',
        request: {
          toolCall: { toolCallId: 'tool-a', title: editToolTitle },
          options: exactOptions,
        },
        responses,
        detached: true,
      },
      { type: 'gate', waitFor: finish.promise },
    ]);

    const pending = await waitForPermission(host, sessionId);
    finish.resolve();
    await vi.waitFor(() => expect(responses[0]).toEqual(cancelled));
    expect(
      (await waitForTurnEnd(host, sessionId)).pendingPermission,
    ).toBeNull();
    expect(
      (await readToolCallUpdate(host, sessionId, 'tool-a'))?._meta?.argo,
    ).toEqual({
      permissionOutcome: { outcome: 'cancelled' },
    });
    await expect(
      host.caller.session.answerPermission({
        sessionId,
        requestId: pending.requestId,
        optionId: allowOnce,
      }),
    ).rejects.toThrow(alreadyAnswered);
  });
});
