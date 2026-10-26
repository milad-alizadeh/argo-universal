import type { InitializeRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const childThread = '01a17a8a-925f-7fe2-b03d-b82baeae507e';

// What codex-acp 2.3.0 stored for the "Greeting" Session (2026-10-26) when the client did not advertise `subagents`.
const legacyToolCalls = [
  {
    sessionUpdate: 'tool_call_update',
    toolCallId: 'call_c622869f8efc4c1ba482df05ead96f8d',
    title: 'Start subagent naming_audit',
    kind: 'other',
    status: 'completed',
    content: [],
    rawInput: {
      agentThreadId: childThread,
      agentPath: '/root/naming_audit',
      activityKind: 'started',
    },
  },
  {
    sessionUpdate: 'tool_call_update',
    toolCallId: 'subagent-completed-01a17a8a-92d5-7350-abd8-8890e72d924f',
    title: 'Complete subagent naming_audit',
    kind: 'other',
    status: 'completed',
    content: [],
    rawInput: {
      agentThreadId: childThread,
      agentPath: '/root/naming_audit',
      activityKind: 'completed',
    },
  },
];

// What codex-acp 2.3.0 sends instead to a client that advertises `subagents`.
const nativeUpdates = [
  {
    sessionUpdate: 'subagent_spawned',
    subagentSessionId: childThread,
    name: 'naming_audit',
    task: 'Audit the naming inconsistencies against the glossary',
    capabilities: {},
  },
  {
    sessionUpdate: 'subagent_state_update',
    subagentSessionId: childThread,
    state: 'completed',
  },
];

it('lists a codex-acp subagent as a Subagent of its Session', async () => {
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
  const { clientCapabilities } = await received.promise;
  const advertised = clientCapabilities?.subagents !== undefined;
  const agent = requireScriptedProcessAt(host.agent.processes);

  // codex-acp draws the lifecycle as plain tool calls unless the client advertised `subagents`.
  const updates = advertised ? nativeUpdates : legacyToolCalls;

  await agent.send(
    updates.map((update) => ({
      jsonrpc: '2.0' as const,
      method: 'session/update',
      params: { sessionId: 'owned-1', update },
    })),
  );

  const snapshot = await waitForAcpSnapshot(host, created.sessionId, (value) =>
    value.subagents.some(({ state }) => state === 'idle'),
  );

  expect(snapshot.subagents).toEqual([
    expect.objectContaining({
      title: 'naming_audit',
      parentSessionId: created.sessionId,
      state: 'idle',
    }),
  ]);
});
