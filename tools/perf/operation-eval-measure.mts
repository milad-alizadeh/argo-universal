/*
 * What one eval run measured, from the Session's live Feed on the observer's one clock: Argo records every
 * Operation an Agent runs as a Tool call row of its own (`argo:` ids), whichever Agent ran it, so the measure
 * needs nothing Agent-specific.
 */

// One Tool call row of the Session, in the order it first appeared.
export type FeedCall = {
  at: number;
  // Argo's own record of an Operation the Agent ran, rather than the Agent's Tool call.
  argo: boolean;
  name: string;
  status: string;
};

// Why an observed Turn has no end: the eval's deadline passed, or the Agent waits on the person.
export type TurnStop = 'timeout' | 'waiting';

export type FirstTurn = {
  // When the eval sent the Prompt, and when its Turn settled; a Turn that never settled says why.
  startedAt: number;
  endedAt: number | null;
  stoppedBy: TurnStop | null;
  model: string | null;
  totalTokens: number | null;
};

type RunOutcome = 'found' | 'missed' | TurnStop;

export type RunMeasure = {
  outcome: RunOutcome;
  // From the Turn's start to Argo recording the expected Operation.
  msToOperation: number | null;
  // The Agent's own Tool calls up to and including the one that ran the expected Operation.
  agentCallsBefore: number;
  // `operation_list` searches before the expected Operation.
  searchesBefore: number;
  // Tool searches the Agent ran to load deferred tools, such as Claude Code's `ToolSearch`.
  toolLoadsBefore: number;
  turnMs: number | null;
  model: string | null;
  totalTokens: number | null;
};

const toolLoad = /toolsearch|tool_search|all_tools/i;

const expectedCall = (
  calls: readonly FeedCall[],
  expected: string,
): FeedCall | undefined =>
  calls.find(
    (call) =>
      call.argo && call.name === expected && call.status === 'completed',
  );

const outcomeOf = (
  found: FeedCall | undefined,
  turn: FirstTurn,
): RunOutcome => {
  if (found) return 'found';

  return turn.stoppedBy ?? 'missed';
};

const turnLength = ({ startedAt, endedAt }: FirstTurn): number | null =>
  endedAt === null ? null : endedAt - startedAt;

// What came before the expected Operation, or the whole Turn when it never ran.
function counted(
  calls: readonly FeedCall[],
  found: FeedCall | undefined,
): Pick<RunMeasure, 'agentCallsBefore' | 'searchesBefore' | 'toolLoadsBefore'> {
  const before = found ? calls.filter((call) => call.at <= found.at) : calls;

  const agent = before.filter((call) => !call.argo);

  return {
    agentCallsBefore: agent.length,
    searchesBefore: before.filter(
      (call) => call.argo && call.name === 'operations.list',
    ).length,
    toolLoadsBefore: agent.filter((call) => toolLoad.test(call.name)).length,
  };
}

export function measureRun(
  turn: FirstTurn,
  calls: readonly FeedCall[],
  expected: string,
): RunMeasure {
  const found = expectedCall(calls, expected);

  return {
    outcome: outcomeOf(found, turn),
    msToOperation: found ? found.at - turn.startedAt : null,
    ...counted(calls, found),
    turnMs: turnLength(turn),
    model: turn.model,
    totalTokens: turn.totalTokens,
  };
}
