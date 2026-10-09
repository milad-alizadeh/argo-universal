import type { AgentMapping } from '../src/agent-adapter';
import type { AgentEvent } from '../src/agent-events';
import { type MappingState, feed, initialMappingState } from './mapping-state';
import { usageOf } from './mapping-usage';
import type { Turn } from './protocol.gen';
type TurnEnded = Extract<AgentEvent, { type: 'agent.turnEnded' }>;
const stopReason = (turn: Turn): TurnEnded['stopReason'] =>
  turn.status === 'interrupted' ? 'cancelled' : failedReason(turn);
const failedReason = (turn: Turn): TurnEnded['stopReason'] =>
  turn.status === 'failed' ? 'error' : 'end_turn';
const turnError = (turn: Turn): Pick<TurnEnded, 'error'> =>
  turn.error
    ? {
        error: {
          code: -32603,
          message: turn.error.message,
          data: {
            info: turn.error.codexErrorInfo,
            details: turn.error.additionalDetails,
          },
        },
      }
    : {};
const turnUsage = (state: MappingState): Pick<TurnEnded, 'usage'> =>
  state.totalUsage
    ? { usage: usageOf(state.totalUsage, state.startingUsage) }
    : {};
const endedEvent = (turn: Turn, state: MappingState): TurnEnded => ({
  type: 'agent.turnEnded',
  stopReason: stopReason(turn),
  ...turnError(turn),
  ...turnUsage(state),
});
const unfinishedStatus = (
  kind: string,
  ended: TurnEnded,
): Record<string, unknown> =>
  kind === 'tool_call_update' || kind === 'compaction_update'
    ? unfinishedResult(ended)
    : {};
interface UnfinishedInput {
  id: string;
  kind: string;
  state: MappingState;
  endedAt: number | undefined;
}
const unfinishedMetadata = ({
  id,
  kind,
  state,
  endedAt,
}: UnfinishedInput): Record<string, unknown> => {
  if (kind !== 'tool_call_update' || endedAt === undefined) return {};
  return { _meta: { argo: { ...toolArgo(state, id), endedAt } } };
};
const unfinishedRows = (
  state: MappingState,
  ended: TurnEnded,
  endedAt: number | undefined,
): AgentEvent[] =>
  Object.entries(state.openRows).map(([id, kind]): AgentEvent =>
    feed({
      type: 'patch',
      id,
      set: unfinishedChange({ id, kind, state, endedAt }, ended),
    }),
  );
export function endTurn(
  turn: Turn,
  mappingState: MappingState,
  endedAt?: number,
): AgentMapping<MappingState> {
  const ended = endedEvent(turn, mappingState);
  return {
    events: [...unfinishedRows(mappingState, ended, endedAt), ended],
    mappingState: {
      ...initialMappingState(),
      totalUsage: mappingState.totalUsage,
    },
  };
}

const unfinishedResult = (ended: TurnEnded): Record<string, unknown> => ({
  status: ended.stopReason === 'cancelled' ? 'cancelled' : 'failed',
});

const toolArgo = (
  state: MappingState,
  id: string,
): NonNullable<MappingState['toolMetadata'][string]>['argo'] =>
  state.toolMetadata[id]?.argo;

const unfinishedChange = (
  input: UnfinishedInput,
  ended: TurnEnded,
): Record<string, unknown> => ({
  state: 'settled',
  ...unfinishedStatus(input.kind, ended),
  ...unfinishedMetadata(input),
});
