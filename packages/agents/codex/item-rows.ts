import type { FeedUpdate } from '../src/agent-events';
import { type MappingState, textRow } from './mapping-state';
import type { ThreadItem } from './protocol.gen';
import { toToolCall } from './tool-calls';
export interface ItemInput {
  item: ThreadItem;
  state: 'open' | 'settled';
  mappingState: MappingState;
  timestamp: number | undefined;
}
type Row = Extract<
  FeedUpdate,
  {
    sessionUpdate:
      | 'agent_message'
      | 'agent_thought'
      | 'tool_call_update'
      | 'compaction_update';
  }
>;
const textItem = ({ item, state }: ItemInput): Row | undefined => {
  if (item.type === 'agentMessage')
    return textRow({
      id: item.id,
      kind: 'agent_message',
      text: item.text,
      state,
    });
  return thoughtItem(item, state);
};
const toolTimestamp = ({
  state,
  timestamp,
}: ItemInput): Record<string, number> => {
  if (timestamp === undefined) return {};
  return state === 'open' ? { startedAt: timestamp } : { endedAt: timestamp };
};
const toolRow = (input: ItemInput): Row | undefined => {
  const { item, state } = input;
  if (item.type !== 'fileChange' && item.type !== 'commandExecution')
    return undefined;
  const row = toToolCall(item, state);
  row._meta = {
    argo: {
      ...priorMetadata(input),
      ...currentMetadata(row),
      ...toolTimestamp(input),
    },
  };
  return row;
};
const compactionRow = ({ item, state }: ItemInput): Row | undefined =>
  item.type === 'contextCompaction'
    ? {
        id: item.id,
        compactionId: item.id,
        sessionUpdate: 'compaction_update',
        state,
        status: state === 'open' ? 'in_progress' : 'completed',
      }
    : undefined;
export const itemRow = (input: ItemInput): Row | undefined =>
  textItem(input) ?? otherItemRow(input);
const otherItemRow = (input: ItemInput): Row | undefined =>
  compactionRow(input) ?? toolRow(input);

const thoughtItem = (
  item: ThreadItem,
  state: ItemInput['state'],
): Row | undefined =>
  item.type === 'reasoning'
    ? textRow({
        id: item.id,
        kind: 'agent_thought',
        text: thoughtText(item),
        state,
      })
    : undefined;
const thoughtText = (
  item: Extract<ThreadItem, { type: 'reasoning' }>,
): string => (item.summary.length ? item.summary : item.content).join('\n\n');
const priorMetadata = (
  input: ItemInput,
): NonNullable<MappingState['toolMetadata'][string]>['argo'] =>
  input.mappingState.toolMetadata[input.item.id]?.argo;
const currentMetadata = (
  row: ReturnType<typeof toToolCall>,
): NonNullable<typeof row._meta>['argo'] => row._meta?.argo;
