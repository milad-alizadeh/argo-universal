import type { RequestPermissionResponse } from '@agentclientprotocol/sdk';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it, vi } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  readNotices,
  permissionSteps,
  readToolCallUpdate,
} from './acp-requests-scenarios.test.mocks';
import {
  allowOnce,
  alreadyAnswered,
  unrecognised,
  editToolTitle,
  cancelled,
  exactOptions,
  startSession,
  waitForPermission,
} from './acp-requests-shared.test.mocks';

describe.each(appFixtureAgentIds)('%s Permission requests', (agent) => {
  it('closing the Session cancels its pending request', async () => {
    const responses: RequestPermissionResponse[] = [];

    const { host, sessionId } = await startSession(agent, [
      {
        type: 'update',
        update: {
          sessionUpdate: 'tool_call',
          toolCallId: 'tool-a',
          title: editToolTitle,
        },
      },
      ...permissionSteps(responses, ['tool-a']),
      { type: 'hold' },
    ]);

    await waitForPermission(host, sessionId);
    await host.caller.session.close({ sessionId });
    await vi.waitFor(() => expect(responses[0]).toEqual(cancelled));
    expect(
      (await readToolCallUpdate(host, sessionId, 'tool-a'))?._meta?.argo,
    ).toEqual({
      permissionOutcome: { outcome: 'cancelled' },
    });
  });

  it('a request the Agent withdraws is no longer answerable', async () => {
    const withdraw = new AbortController();

    const { host, sessionId } = await startSession(agent, [
      {
        type: 'permission',
        request: {
          toolCall: { toolCallId: 'tool-a', title: editToolTitle },
          options: exactOptions,
        },
        signal: withdraw.signal,
        detached: true,
      },
      { type: 'hold' },
    ]);

    const pending = await waitForPermission(host, sessionId);
    withdraw.abort();
    await waitForAcpSnapshot(
      host,
      sessionId,
      (snapshot) =>
        snapshot.pendingPermission === null && snapshot.state === 'running',
    );
    await expect(
      host.caller.session.answerPermission({
        sessionId,
        requestId: pending.requestId,
        optionId: allowOnce,
      }),
    ).rejects.toThrow(alreadyAnswered);
  });

  it('a malformed request is cancelled and reported', async () => {
    const responses: RequestPermissionResponse[] = [];

    const { host, sessionId } = await startSession(agent, [
      {
        type: 'permission',
        request: {
          toolCall: { toolCallId: 'tool-a', title: editToolTitle },
          options: [],
        },
        responses,
      },
      { type: 'hold' },
    ]);

    await vi.waitFor(() => expect(responses[0]).toEqual(cancelled));
    await vi.waitFor(async () =>
      expect(await readNotices(host, sessionId)).toEqual([
        expect.objectContaining({ severity: 'warning', title: unrecognised }),
      ]),
    );
  });
});
