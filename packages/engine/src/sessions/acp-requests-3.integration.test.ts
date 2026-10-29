import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import {
  permissionSteps,
  readToolCallUpdate,
} from './acp-requests-scenarios.test.mocks';
import {
  type Outcomes,
  alwaysAllow,
  allowOnce,
  reject,
  alreadyAnswered,
  promptSession,
  startSession,
  waitForPermission,
} from './acp-requests-shared.test.mocks';

describe.each(appFixtureAgentIds)('%s Permission requests', (agent) => {
  it.each([
    [alwaysAllow, 'Always allow edits', 'allow_always'],
    [reject, 'Reject', 'reject_once'],
  ])(
    'the Feed keeps the name and kind of the chosen %s option on its Tool call',
    async (optionId, name, kind) => {
      const { host, sessionId } = await startSession(agent, [
        {
          type: 'update',
          update: {
            sessionUpdate: 'tool_call',
            toolCallId: 'tool-a',
            title: 'Edit',
          },
        },
        ...permissionSteps([], ['tool-a']),
      ]);

      const pending = await waitForPermission(host, sessionId);
      await host.caller.session.answerPermission({
        sessionId,
        requestId: pending.requestId,
        optionId,
      });
      await waitForAcpSessionIdle(host, sessionId);
      expect(
        (await readToolCallUpdate(host, sessionId, 'tool-a'))?._meta?.argo,
      ).toEqual({
        permissionOutcome: { outcome: 'selected', optionId, name, kind },
      });
    },
  );

  it('an answer in one Session never settles a request in another', async () => {
    const outcomes: Outcomes = [];

    const { host, sessionId } = await startSession(
      agent,
      permissionSteps(outcomes, ['tool-a']),
    );

    const other = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });

    await promptSession(host, other.sessionId);
    const waiting = await waitForPermission(host, sessionId);
    const elsewhere = await waitForPermission(host, other.sessionId);
    await expect(
      host.caller.session.answerPermission({
        sessionId,
        requestId: elsewhere.requestId,
        optionId: allowOnce,
      }),
    ).rejects.toThrow(alreadyAnswered);
    expect(outcomes).toHaveLength(0);
    expect(await waitForPermission(host, sessionId)).toEqual(waiting);
  });

  it('a duplicate answer is rejected without consuming the next request', async () => {
    const outcomes: Outcomes = [];

    const { host, sessionId } = await startSession(
      agent,
      permissionSteps(outcomes, ['tool-a', 'tool-b']),
    );

    const first = await waitForPermission(host, sessionId, 'tool-a');

    const answer = {
      sessionId,
      requestId: first.requestId,
      optionId: allowOnce,
    };

    await host.caller.session.answerPermission(answer);
    await expect(host.caller.session.answerPermission(answer)).rejects.toThrow(
      alreadyAnswered,
    );
    await waitForPermission(host, sessionId, 'tool-b');
    expect(outcomes).toHaveLength(1);
  });
});
