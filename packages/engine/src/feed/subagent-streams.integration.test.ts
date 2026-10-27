import type { InitializeRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const childThread = '01a17a8a-925f-7fe2-b03d-b82baeae507e';

const task = 'Audit the naming inconsistencies against the glossary';

// What codex-acp 2.3.0 sends a client that advertises `subagents`: the draft updates.
const codexDraftUpdates = [
  {
    sessionUpdate: 'subagent_spawned',
    subagentSessionId: childThread,
    name: 'naming_audit',
    task,
    capabilities: {},
  },
  {
    sessionUpdate: 'subagent_state_update',
    subagentSessionId: childThread,
    state: 'completed',
  },
];

// What claude-agent-acp 0.97.0 sends the same client: the standard updates.
const claudeStandardUpdates = [
  {
    sessionUpdate: 'subagent_update',
    sessionId: childThread,
    title: 'naming_audit',
    capabilities: { cancel: {} },
    state: { state: 'running' },
  },
  {
    sessionUpdate: 'session_message',
    messageId: 'toolu_01',
    senderSessionId: 'owned-1',
    recipientSessionId: childThread,
    content: [{ type: 'text', text: task }],
  },
  {
    sessionUpdate: 'subagent_update',
    sessionId: childThread,
    state: { state: 'idle', stopReason: 'end_turn' },
  },
];

it.each([
  { agent: 'codex-acp 2.3.0', updates: codexDraftUpdates },
  { agent: 'claude-agent-acp 0.97.0', updates: claudeStandardUpdates },
])(
  'lists the child Session $agent sends as a finished child of its Session',
  async ({ updates }) => {
    const received = Promise.withResolvers<InitializeRequest>();

    const host = await startAcpEngine({
      steps: [],
      initialize: {
        protocolVersion: 1,
        agentCapabilities: { sessionCapabilities: { close: {} } },
      },
      responses: { initialize: [{ received }] },
    });

    const created = await host.caller.session.new(emptySessionInput);

    expect((await received.promise).clientCapabilities?.subagents).toEqual({});

    await requireScriptedProcessAt(host.agent.processes).send(
      updates.map((update) => ({
        jsonrpc: '2.0' as const,
        method: 'session/update',
        params: { sessionId: 'owned-1', update },
      })),
    );

    const snapshot = await waitForAcpSnapshot(
      host,
      created.sessionId,
      (value) => value.subagents.some(({ state }) => state === 'idle'),
    );

    expect(snapshot.subagents).toEqual([
      expect.objectContaining({
        title: 'naming_audit',
        parentSessionId: created.sessionId,
        state: 'idle',
        stopReason: 'end_turn',
      }),
    ]);
  },
);
