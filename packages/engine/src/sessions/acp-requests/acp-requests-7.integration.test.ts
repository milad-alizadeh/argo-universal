import type { CreateElicitationResponse } from '@agentclientprotocol/sdk';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it, vi } from 'vitest';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import {
  readNotices,
  elicitationSteps,
} from './acp-requests-scenarios.test.mocks';
import {
  createElicitation,
  alreadyAnswered,
  unrecognised,
  unknownElicitationId,
  startSession,
  waitForElicitation,
  waitForTurnEnd,
} from './acp-requests-shared.test.mocks';

describe.each(appFixtureAgentIds)('%s Elicitations', (agent) => {
  it('a duplicate answer is rejected without consuming the next Elicitation', async () => {
    const results: CreateElicitationResponse[] = [];

    const { host, sessionId } = await startSession(
      agent,
      elicitationSteps(results, ['First', 'Second']),
    );

    const first = await waitForElicitation(host, sessionId, 'First');

    const answer = {
      sessionId,
      requestId: first.requestId,
      action: 'decline' as const,
    };

    await host.caller.session.answerElicitation(answer);
    await expect(host.caller.session.answerElicitation(answer)).rejects.toThrow(
      alreadyAnswered,
    );
    await waitForElicitation(host, sessionId, 'Second');
    expect(results).toHaveLength(1);
  });

  it('a URL Elicitation is cancelled without being presented', async () => {
    const responses: CreateElicitationResponse[] = [];

    const { host, sessionId } = await startSession(agent, [
      {
        type: 'elicitation',
        request: {
          mode: 'url',
          elicitationId: 'sign-in',
          url: 'https://example.com/sign-in',
          message: 'Sign in',
        },
        responses,
      },
    ]);

    await vi.waitFor(() => expect(responses[0]).toEqual({ action: 'cancel' }));
    expect(
      (await waitForTurnEnd(host, sessionId)).pendingElicitation,
    ).toBeNull();
  });

  it('an Elicitation in an unknown mode is cancelled and reported', async () => {
    const { host, sessionId } = await startSession(agent, [
      {
        type: 'raw',
        frame: JSON.stringify({
          jsonrpc: '2.0',
          id: unknownElicitationId,
          method: createElicitation,
          params: { mode: 'voice', sessionId: '$sessionId', message: 'Say it' },
        }),
      },
      { type: 'hold' },
    ]);

    const process = requireScriptedProcessAt(host.agent.processes);
    let reply = await process.receive();

    while (!('id' in reply) || reply.id !== unknownElicitationId)
      reply = await process.receive();
    expect(reply).toMatchObject({
      id: unknownElicitationId,
      result: { action: 'cancel' },
    });
    await vi.waitFor(async () =>
      expect(await readNotices(host, sessionId)).toEqual([
        expect.objectContaining({
          title: unrecognised,
          description: 'Unknown Elicitation mode voice',
        }),
      ]),
    );
  });
});
