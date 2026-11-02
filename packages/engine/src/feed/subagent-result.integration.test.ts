import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const child = 'agent_t';

const parent = 'owned-1';

const method = 'session/update';

// Claude ACP 0.97.0's simulated subagent-transcript-extension fixture sends the reply only on the parent transcript.
it('stores the actual parent-reported result for the Agent’s Inspector', async () => {
  const host = await startAcpEngine({
    steps: [],
    initialize: {
      protocolVersion: 1,
      agentCapabilities: { sessionCapabilities: { close: {} } },
    },
  });

  const created = await host.caller.session.new(emptySessionInput);

  await requireScriptedProcessAt(host.agent.processes).send([
    {
      jsonrpc: '2.0',
      method,
      params: {
        sessionId: parent,
        update: {
          sessionUpdate: 'subagent_update',
          sessionId: child,
          state: { state: 'running' },
        },
      },
    },
    {
      jsonrpc: '2.0',
      method,
      params: {
        sessionId: parent,
        update: {
          sessionUpdate: 'session_message',
          messageId: 'toolu_transcript:reply',
          senderSessionId: child,
          recipientSessionId: parent,
          content: [{ type: 'text', text: 'Two packages.' }],
        },
      },
    },
    {
      jsonrpc: '2.0',
      method,
      params: {
        sessionId: parent,
        update: {
          sessionUpdate: 'subagent_update',
          sessionId: child,
          state: { state: 'idle', stopReason: 'end_turn' },
        },
      },
    },
  ]);

  const snapshot = await waitForAcpSnapshot(host, created.sessionId, (value) =>
    value.subagents.some(({ state }) => state === 'idle'),
  );

  const childId = snapshot.subagents[0]?.sessionId;

  if (!childId) throw new Error('Expected a child Session');

  await vi.waitFor(async () => {
    const page = await host.caller.feed.reports({
      sessionId: created.sessionId,
      childSessionId: childId,
      direction: 'tail',
    });

    expect(page.rows).toEqual([
      expect.objectContaining({
        sessionUpdate: 'subagent_update',
        _meta: { argo: { result: [{ type: 'text', text: 'Two packages.' }] } },
      }),
    ]);
  });
});
