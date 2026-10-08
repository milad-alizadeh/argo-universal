import type { AgentMapping } from '../src/agent-adapter';
import type { FeedUpdate } from '../src/agent-events';
import { type ItemInput, itemRow } from './item-rows';
import { type MappingState, dropped, upsert } from './mapping-state';
import type { ThreadItem } from './protocol.gen';
const planItem = ({
  item,
  state,
  mappingState,
}: ItemInput): AgentMapping<MappingState> => {
  if (item.type !== 'plan' || state === 'open') return dropped(mappingState);
  return {
    mappingState,
    events: [
      upsert(planRow(item, state)),
      { type: 'agent.planProposed', planId: item.id, content: item.text },
    ],
  };
};
const trackOpenRows = (
  input: ItemInput,
  row: NonNullable<ReturnType<typeof itemRow>>,
): MappingState['openRows'] => {
  const openRows = { ...input.mappingState.openRows };
  if (input.state === 'settled') delete openRows[input.item.id];
  else openRows[input.item.id] = row.sessionUpdate;
  return openRows;
};
const trackToolMetadata = (
  input: ItemInput,
  row: NonNullable<ReturnType<typeof itemRow>>,
): MappingState['toolMetadata'] => {
  const toolMetadata = { ...input.mappingState.toolMetadata };
  if (input.state === 'settled') delete toolMetadata[input.item.id];
  else if (row.sessionUpdate === 'tool_call_update')
    toolMetadata[input.item.id] = row._meta;
  return toolMetadata;
};
const trackedItem = (
  input: ItemInput,
  row: NonNullable<ReturnType<typeof itemRow>>,
): AgentMapping<MappingState> => ({
  events: [upsert(row)],
  mappingState: {
    ...input.mappingState,
    openRows: trackOpenRows(input, row),
    toolMetadata: trackToolMetadata(input, row),
  },
});
export function mapItem(input: ItemInput): AgentMapping<MappingState> {
  if (input.item.type === 'plan') return planItem(input);
  const row = itemRow(input);
  return row ? trackedItem(input, row) : dropped(input.mappingState);
}

const planRow = (
  item: Extract<ThreadItem, { type: 'plan' }>,
  state: ItemInput['state'],
): Extract<FeedUpdate, { sessionUpdate: 'plan_update' }> => ({
  id: item.id,
  sessionUpdate: 'plan_update',
  state,
  plan: { type: 'markdown', planId: item.id, content: item.text },
});
