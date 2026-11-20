import type { SessionUpdate } from '@repo/contracts';
import { z } from 'zod';
import {
  measureRun,
  type FeedCall,
  type FirstTurn,
  type RunMeasure,
} from './operation-eval-measure.mts';
import { answer, runOperation, settle } from './operation-eval-operations.mts';
import type { EvalTask } from './operation-eval-tasks.mts';
import type { RuntimeClient } from './runtime-client.mts';
import { watchRuntime, type TimedRuntimeRow } from './runtime-watch.mts';

export type EvalRun = {
  client: RuntimeClient;
  projectId: string;
  agent: string;
  task: EvalTask;
  timeoutMs: number;
};

type ToolCallRow = Extract<
  SessionUpdate,
  { sessionUpdate: 'tool_call_update' }
>;

const isToolCall = (row: SessionUpdate): row is ToolCallRow =>
  row.sessionUpdate === 'tool_call_update';

const callName = (row: ToolCallRow): string => row.name ?? row.title ?? '';

const callStatus = (row: ToolCallRow): string => row.status ?? '';

// Each Tool call row as first seen on the observer's clock, with its latest name and status.
class SeenCalls {
  private readonly calls = new Map<string, FeedCall>();

  public see({ row, atMs }: TimedRuntimeRow): void {
    if (isToolCall(row)) this.record(row, atMs);
  }

  public list(): FeedCall[] {
    return [...this.calls.values()].toSorted((a, b) => a.at - b.at);
  }

  private record(row: ToolCallRow, atMs: number): void {
    this.calls.set(row.id, {
      at: this.firstSeen(row.id, atMs),
      argo: row.id.startsWith('argo:'),
      name: callName(row),
      status: callStatus(row),
    });
  }

  private firstSeen(id: string, atMs: number): number {
    return this.calls.get(id)?.at ?? atMs;
  }
}

const started = z.object({ sessionId: z.string() });

// An idle Session on the Project's main Checkout with the Agent's own defaults, so the Feed is watched before the Prompt.
const startSession = async (run: EvalRun): Promise<string> => {
  const params = {
    projectId: run.projectId,
    agent: run.agent,
    checkout: { type: 'main' },
    configOptions: [],
  };

  return (await answer(run.client, { id: 'session.new', params }, started))
    .sessionId;
};

const sendPrompt = (
  run: EvalRun,
  sessionId: string,
): ReturnType<typeof runOperation> =>
  runOperation(run.client, {
    id: 'session.prompt',
    params: { sessionId, prompt: [{ type: 'text', text: run.task.prompt }] },
    wait: false,
  });

type Settled = Awaited<ReturnType<typeof settle>>;

const tokensOf = (turn: NonNullable<Settled['turn']>): number | null =>
  turn.usage?.totalTokens ?? null;

const spent = ({ turn }: Settled): Pick<FirstTurn, 'model' | 'totalTokens'> =>
  turn === null
    ? { model: null, totalTokens: null }
    : { model: turn.model, totalTokens: tokensOf(turn) };

// Sends the task as the Session's first Prompt and times its Turn from the moment it is sent.
async function observeTurn(
  run: EvalRun,
  sessionId: string,
): Promise<FirstTurn> {
  const startedAt = performance.now();

  const prompt = await sendPrompt(run, sessionId);

  const settled = await settle(run.client, prompt, startedAt + run.timeoutMs);

  const endedAt = settled.stoppedBy === null ? performance.now() : null;

  return {
    startedAt,
    endedAt,
    stoppedBy: settled.stoppedBy,
    ...spent(settled),
  };
}

// A Turn the eval stopped watching is cancelled, so it spends no more of the Agent's quota.
async function finished(run: EvalRun, sessionId: string): Promise<FirstTurn> {
  const turn = await observeTurn(run, sessionId);

  if (turn.stoppedBy !== null)
    await runOperation(run.client, {
      id: 'session.cancel',
      params: { sessionId },
      wait: false,
    });

  return turn;
}

// Starts a Session, sends the task, and measures how the Agent reached the expected Operation.
export async function runEvalTask(
  run: EvalRun,
): Promise<RunMeasure & { sessionId: string }> {
  const sessionId = await startSession(run);

  const calls = new SeenCalls();

  const signal = AbortSignal.timeout(run.timeoutMs * 2);

  const observation = await watchRuntime(run.client, sessionId, signal);

  observation.watch.observe((timed) => calls.see(timed));

  try {
    const turn = await finished(run, sessionId);

    return { ...measureRun(turn, calls.list(), run.task.expected), sessionId };
  } finally {
    observation.stop();
  }
}
