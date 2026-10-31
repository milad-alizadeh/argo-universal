import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const lateText = 'I stopped the command ';

const lateRest = 'you asked me to stop.';

const lateMarker = 'Late marker';

type FeedRowReading = {
  sessionUpdate: string;
  state: string;
  scope: 'turn' | 'session';
};

const readRow = (row: {
  sessionUpdate: string;
  state: string;
  turnId: string | null;
}): FeedRowReading => ({
  sessionUpdate: row.sessionUpdate,
  state: row.state,
  scope: row.turnId === null ? 'session' : 'turn',
});

// An Agent that keeps talking after its cancelled Turn answered, as `claude-acp` does (#1669).
it('settles the message an Agent sends after its cancelled Turn ended, which no Turn can settle', async () => {
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        {
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: 'tool_call_update',
                toolCallId: 'shell',
                title: 'Long command',
                kind: 'execute',
                status: 'in_progress',
              },
            },
            { type: 'wait-for-cancel' },
          ],
        },
      ],
    },
  });

  const session = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Run the long command' }],
  });

  await expect
    .poll(() => host.caller.feed.page({ ...session, direction: 'tail' }), {
      timeout: 5000,
    })
    .toMatchObject({
      rows: expect.arrayContaining([
        expect.objectContaining({ sessionUpdate: 'tool_call_update' }),
      ]),
    });
  await host.caller.session.cancel(session);
  await waitForAcpSessionIdle(host, session.sessionId);

  await requireScriptedProcessAt(host.agent.processes).play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: lateText },
        },
      },
      {
        type: 'update',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: lateRest },
        },
      },
      {
        type: 'update',
        update: {
          sessionUpdate: 'notice',
          severity: 'info',
          title: lateMarker,
        },
      },
    ],
    'owned-1',
  );

  await expect
    .poll(() => host.caller.feed.page({ ...session, direction: 'tail' }), {
      timeout: 5000,
    })
    .toMatchObject({
      rows: expect.arrayContaining([
        expect.objectContaining({ sessionUpdate: 'notice', title: lateMarker }),
      ]),
    });

  const page = await host.caller.feed.page({ ...session, direction: 'tail' });

  expect(page.rows.map(readRow)).toEqual([
    { sessionUpdate: 'user_message', state: 'settled', scope: 'turn' },
    { sessionUpdate: 'tool_call_update', state: 'settled', scope: 'turn' },
    { sessionUpdate: 'notice', state: 'settled', scope: 'turn' },
    { sessionUpdate: 'agent_message', state: 'settled', scope: 'session' },
    { sessionUpdate: 'notice', state: 'settled', scope: 'session' },
  ]);
  expect(
    page.rows.find((row) => row.sessionUpdate === 'agent_message'),
  ).toMatchObject({
    content: [{ type: 'text', text: `${lateText}${lateRest}` }],
  });
  expect(
    page.rows.find((row) => row.sessionUpdate === 'tool_call_update'),
  ).toMatchObject({ status: 'cancelled' });
}, 30_000);
