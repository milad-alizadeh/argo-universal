import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { expect } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

export const toolUpdates: SessionNotification['update'][] = [
  {
    sessionUpdate: 'tool_call_update',
    toolCallId: 'waiting',
    status: 'pending',
  },
  {
    sessionUpdate: 'tool_call_update',
    toolCallId: 'running',
    status: 'in_progress',
  },
  {
    sessionUpdate: 'tool_call_update',
    toolCallId: 'done',
    status: 'completed',
  },
  { sessionUpdate: 'tool_call_update', toolCallId: 'broken', status: 'failed' },
];

export const expectedTools = [
  { toolCallId: 'waiting', status: 'cancelled', state: 'settled' },
  { toolCallId: 'running', status: 'cancelled', state: 'settled' },
  { toolCallId: 'done', status: 'completed', state: 'settled' },
  { toolCallId: 'broken', status: 'failed', state: 'settled' },
];

type Ending = 'completion' | 'cancel' | 'agent_crash';

export const endingSteps = (ending: Ending): ScriptedStep[] =>
  ending === 'completion'
    ? []
    : [{ type: ending === 'cancel' ? 'wait-for-cancel' : 'hold' }];

export const finishTurn = async (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
  sessionId: string,
  ending: Ending,
): Promise<void> => {
  if (ending === 'completion') return;
  await expect
    .poll(
      async () =>
        (await host.caller.feed.page({ sessionId, direction: 'tail' })).rows
          .length,
    )
    .toBe(5);

  await (ending === 'cancel'
    ? host.caller.session.cancel({ sessionId })
    : requireScriptedProcessAt(host.agent.processes).play(
        [{ type: 'exit', code: 17, stderr: 'Agent fixture failed' }],
        'owned-1',
      ));
};
