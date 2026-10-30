import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';
import type { ToolCallUpdate } from '@repo/contracts';
import { assert, vi } from 'vitest';
import type { EngineInput } from '../src/engine/machine';
import type { OperationWaitClock } from '../src/operations';
import { startAcpEngine } from './acp-engine';
import { waitForAcpSnapshot } from './acp-feed';
import { openAccessSession, sessionIdentityStep } from './session-access';

type RaceHost = {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  session: Awaited<ReturnType<typeof openAccessSession>>;
};

export async function operationRaceHost(
  operationWaitClock?: OperationWaitClock,
  fetchAgents?: EngineInput['fetchAgents'],
): Promise<RaceHost> {
  const outputs: TerminalOutputResponse[] = [];

  const host = await startAcpEngine(
    raceScenario(outputs, { operationWaitClock, fetchAgents }),
  );

  const session = await openAccessSession({ host, outputs }, 'First');

  return { host, session };
}

type RaceOptions = {
  operationWaitClock?: OperationWaitClock;
  fetchAgents?: EngineInput['fetchAgents'];
};

const raceScenario = (
  outputs: TerminalOutputResponse[],
  options: RaceOptions,
): Parameters<typeof startAcpEngine>[0] => ({
  ...options,
  steps: [],
  responses: {
    'session/prompt': [
      { steps: [sessionIdentityStep(outputs)] },
      { steps: [{ type: 'wait-for-cancel' }] },
    ],
  },
});

type Host = Awaited<ReturnType<typeof operationRaceHost>>['host'];

export async function beginHeldTurn(
  host: Host,
  sessionId: string,
): Promise<void> {
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Keep working' }],
  });
  await waitForAcpSnapshot(
    host,
    sessionId,
    (snapshot) => snapshot.activeTurnId !== null,
  );
}

export function pendingOperation(
  host: Host,
  sessionId: string,
): Promise<ToolCallUpdate> {
  return vi.waitFor(async () => {
    const page = await host.caller.feed.page({ sessionId, direction: 'tail' });

    const row = page.rows.find(isProjectListUpdate);

    assert(row?.sessionUpdate === 'tool_call_update');
    assert(row.status === 'in_progress');

    return row;
  });
}

const isProjectListUpdate = (
  item: Awaited<ReturnType<Host['caller']['feed']['page']>>['rows'][number],
): boolean =>
  item.sessionUpdate === 'tool_call_update' && item.name === 'project.list';
