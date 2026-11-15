import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot, waitForAcpSessionIdle } from '#mocks/acp-feed';

const nextPrompt = 'Run the smoke suite';

it.each(['prompt', 'submit'] as const)(
  'shares a background suggestion outside the Feed through session.%s',
  async (submission) => {
    const host = await startAcpEngine({
      steps: [],
      sessionIds: ['main-conversation', 'background-prediction'],
      responses: {
        'session/prompt': [
          {
            steps: [
              {
                type: 'update',
                update: {
                  sessionUpdate: 'agent_message_chunk',
                  content: { type: 'text', text: 'The failing test is fixed.' },
                },
              },
            ],
          },
          {
            prompt: 'Return JSON only:',
            steps: [
              {
                type: 'update',
                update: {
                  sessionUpdate: 'agent_message_chunk',
                  content: {
                    type: 'text',
                    text: JSON.stringify({ suggestion: `  ${nextPrompt} \n` }),
                  },
                },
              },
            ],
          },
        ],
      },
    });

    const { sessionId } = await host.caller.session.new(emptySessionInput);
    await host.caller.session[submission]({
      sessionId,
      prompt: [{ type: 'text', text: 'Fix the failing test' }],
      followUpSuggestions: true,
    });
    await waitForAcpSessionIdle(host, sessionId);

    const snapshot = await waitForAcpSnapshot(
      host,
      sessionId,
      (value) => value.followUpSuggestion?.text === nextPrompt,
    );

    expect(snapshot.followUpSuggestion).toMatchObject({ text: nextPrompt });
    const shared = await host.caller.session.get({ sessionId });
    expect(shared.followUpSuggestion).toEqual(snapshot.followUpSuggestion);
    expect(
      (await host.caller.session.list({ archived: false })).sessions,
    ).toHaveLength(1);
    const page = await host.caller.feed.page({ sessionId, direction: 'tail' });
    expect(JSON.stringify(page.rows)).not.toContain(nextPrompt);
    expect(JSON.stringify(page.rows)).toContain('The failing test is fixed.');
  },
);
