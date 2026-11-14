import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';
import type { ToolCallUpdate, FeedSubscribeOutput } from '@repo/contracts';
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

export async function pendingOperation(
  host: Host,
  sessionId: string,
): Promise<ToolCallUpdate> {
  const updates = await host.caller.feed.subscribe({ sessionId, after: null });

  for await (const update of updates) {
    const row = pendingProjectList(update);

    if (row) return row;
  }

  throw new Error('The Feed closed before the pending project.list Operation');
}

function pendingProjectList(
  update: FeedSubscribeOutput,
): ToolCallUpdate | undefined {
  if (update.type !== 'row.upsert') return undefined;

  return isPendingProjectListUpdate(update.row) ? update.row : undefined;
}

function isPendingProjectListUpdate(
  item: Awaited<ReturnType<Host['caller']['feed']['page']>>['rows'][number],
): item is ToolCallUpdate {
  if (item.sessionUpdate !== 'tool_call_update') return false;

  return item.name === 'project.list' && item.status === 'in_progress';
}
