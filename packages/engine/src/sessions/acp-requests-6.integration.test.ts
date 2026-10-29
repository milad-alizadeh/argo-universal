import type { CreateElicitationResponse } from '@agentclientprotocol/sdk';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it } from 'vitest';
import { elicitationSteps } from './acp-requests-scenarios.test.mocks';
import {
  issueMessage,
  issueSchema,
  startSession,
  waitForElicitation,
  waitForTurnEnd,
} from './acp-requests-shared.test.mocks';

describe.each(appFixtureAgentIds)('%s Elicitations', (agent) => {
  it('presents a form Elicitation with its exact schema', async () => {
    const { host, sessionId } = await startSession(
      agent,
      elicitationSteps([], [issueMessage]),
    );

    expect(await waitForElicitation(host, sessionId)).toEqual({
      requestId: expect.any(String),
      mode: 'form',
      message: issueMessage,
      toolCallId: 'tool-a',
      requestedSchema: issueSchema,
    });
  });

  it('delivers the accepted form content to the exact Elicitation', async () => {
    const results: CreateElicitationResponse[] = [];

    const { host, sessionId } = await startSession(
      agent,
      elicitationSteps(results, [issueMessage]),
    );

    const pending = await waitForElicitation(host, sessionId);
    await host.caller.session.answerElicitation({
      sessionId,
      requestId: pending.requestId,
      action: 'accept',
      content: { title: 'Drafts vanish after a reconnect', estimate: 3 },
    });
    await waitForTurnEnd(host, sessionId);
    expect(results[0]).toEqual({
      action: 'accept',
      content: { title: 'Drafts vanish after a reconnect', estimate: 3 },
    });
  });

  it('refuses content that does not match the form and keeps it pending', async () => {
    const { host, sessionId } = await startSession(
      agent,
      elicitationSteps([], [issueMessage]),
    );

    const pending = await waitForElicitation(host, sessionId);
    await expect(
      host.caller.session.answerElicitation({
        sessionId,
        requestId: pending.requestId,
        action: 'accept',
        content: { title: 7 },
      }),
    ).rejects.toThrow('does not match');
    expect(await waitForElicitation(host, sessionId)).toEqual(pending);
  });

  it('queues concurrent Elicitations and settles each with its own answer', async () => {
    const results: CreateElicitationResponse[] = [];

    const { host, sessionId } = await startSession(
      agent,
      elicitationSteps(results, ['First', 'Second']),
    );

    const first = await waitForElicitation(host, sessionId, 'First');
    await host.caller.session.answerElicitation({
      sessionId,
      requestId: first.requestId,
      action: 'decline',
    });
    await waitForElicitation(host, sessionId, 'Second');
    expect(results).toEqual([{ action: 'decline' }]);
  });
});
