import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

// A running Tool call reports its own ending, so settling it early would read as cancelled (ADR-0024).
it('leaves a Tool call the Agent starts outside a Turn open until the Agent says how it ended', async () => {
  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/prompt': [{ steps: [] }] },
  });

  const session = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Anything' }],
  });

  await waitForAcpSessionIdle(host, session.sessionId);
  await requireScriptedProcessAt(host.agent.processes).play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: 'late',
          title: 'Unasked command',
          kind: 'execute',
          status: 'in_progress',
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
        expect.objectContaining({ sessionUpdate: 'tool_call_update' }),
      ]),
    });

  const page = await host.caller.feed.page({ ...session, direction: 'tail' });

  expect(
    page.rows.find((row) => row.sessionUpdate === 'tool_call_update'),
  ).toMatchObject({ turnId: null, state: 'open', status: 'in_progress' });
}, 30_000);
