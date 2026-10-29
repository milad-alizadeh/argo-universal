import type {
  CreateElicitationResponse,
  ElicitationSchema,
} from '@agentclientprotocol/sdk';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import {
  startSession,
  waitForElicitation,
} from './acp-requests/acp-requests-shared.test.mocks';

describe.each(appFixtureAgentIds)('%s Elicitations', (agent) => {
  it('presents native Codex questions with schema metadata and resumes with the chosen answer', async () => {
    // Codex ACP 2.3.0 CodexElicitationHandler.buildUserInputRequest, non-AIR profile.
    const requestedSchema = {
      type: 'object',
      properties: {
        color: {
          type: 'string',
          title: 'Which synthetic QA color should we use?',
          description: 'Color',
          oneOf: [
            { const: 'Red', title: 'Red', description: 'Use red' },
            { const: 'Blue', title: 'Blue', description: 'Use blue' },
            {
              const: 'None of the above',
              title: 'None of the above',
              description: 'Provide a different answer in the note field.',
            },
          ],
          _meta: { codex: { isOther: true, isSecret: false } },
        },
        color_note: {
          type: 'string',
          title: 'Additional answer or note',
          _meta: {
            codex: { questionId: 'color', role: 'user_note', isSecret: false },
          },
        },
      },
      required: ['color'],
    } satisfies ElicitationSchema;

    const responses: CreateElicitationResponse[] = [];

    const { host, sessionId } = await startSession(agent, [
      {
        type: 'elicitation',
        request: {
          mode: 'form',
          toolCallId: 'native-question',
          message: 'Codex needs your input to continue.',
          requestedSchema,
        },
        responses,
      },
      {
        type: 'update',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: 'Continuing with Blue.' },
        },
      },
    ]);

    const pending = await waitForElicitation(host, sessionId);
    expect(pending).toMatchObject({
      requestedSchema,
      toolCallId: 'native-question',
    });
    await expect(
      host.caller.session.answerElicitation({
        sessionId,
        requestId: pending.requestId,
        action: 'accept',
        content: { color: 7 },
      }),
    ).rejects.toThrow('does not match');
    expect(await waitForElicitation(host, sessionId)).toEqual(pending);
    await host.caller.session.answerElicitation({
      sessionId,
      requestId: pending.requestId,
      action: 'accept',
      content: { color: 'Blue', color_note: 'QA choice' },
    });
    await waitForAcpSessionIdle(host, sessionId);
    expect(responses).toEqual([
      { action: 'accept', content: { color: 'Blue', color_note: 'QA choice' } },
    ]);
    const page = await host.caller.feed.page({ sessionId, direction: 'tail' });
    expect(page.rows).toContainEqual(
      expect.objectContaining({
        sessionUpdate: 'agent_message',
        content: [{ type: 'text', text: 'Continuing with Blue.' }],
      }),
    );
    expect(
      (await host.caller.session.get({ sessionId })).pendingElicitation,
    ).toBeNull();
  });
});
