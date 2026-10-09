import type { AgentMapping } from '../src/agent-adapter';
import { mapItem } from './item-events';
import {
  type MappingState,
  dropped,
  feed,
  messageTextField,
} from './mapping-state';
import type { VendorMessage } from './messages';
import { endTurn } from './turn-events';
export const turnStarted = (
  message: Extract<VendorMessage, { method: 'turn/started' }>,
  mappingState: MappingState,
): AgentMapping<MappingState> => {
  if (mappingState.vendorTurnId === message.params.turn.id)
    return dropped(mappingState);
  return {
    events: [{ type: 'agent.turnStarted' }],
    mappingState: startTurnMapping(message.params.turn.id, mappingState),
  };
};
export const turnCompleted = (
  message: Extract<VendorMessage, { method: 'turn/completed' }>,
  mappingState: MappingState,
): AgentMapping<MappingState> =>
  endTurn(message.params.turn, mappingState, message.receivedAt);
export const itemStarted = (
  message: Extract<VendorMessage, { method: 'item/started' }>,
  mappingState: MappingState,
): AgentMapping<MappingState> =>
  mapItem({
    item: message.params.item,
    state: 'open',
    mappingState,
    timestamp: message.params.startedAtMs ?? message.receivedAt,
  });
export const itemCompleted = (
  message: Extract<VendorMessage, { method: 'item/completed' }>,
  mappingState: MappingState,
): AgentMapping<MappingState> =>
  mapItem({
    item: message.params.item,
    state: 'settled',
    mappingState,
    timestamp: message.params.completedAtMs ?? message.receivedAt,
  });
const appendText = ({
  id,
  text,
  field,
  mappingState,
}: {
  id: string;
  text: string;
  field: string;
  mappingState: MappingState;
}): AgentMapping<MappingState> => {
  if (!(id in mappingState.openRows)) return dropped(mappingState);
  return { events: [feed({ type: 'append', id, field, text })], mappingState };
};
export const agentMessageDelta = (
  message: Extract<VendorMessage, { method: 'item/agentMessage/delta' }>,
  mappingState: MappingState,
): AgentMapping<MappingState> =>
  appendText({
    id: message.params.itemId,
    text: message.params.delta,
    field: messageTextField,
    mappingState,
  });
export const commandOutputDelta = (
  message: Extract<
    VendorMessage,
    { method: 'item/commandExecution/outputDelta' }
  >,
  mappingState: MappingState,
): AgentMapping<MappingState> =>
  appendText({
    id: message.params.itemId,
    text: message.params.delta,
    field: 'content.0.output',
    mappingState,
  });
export const reasoningTextDelta = (
  message: Extract<VendorMessage, { method: 'item/reasoning/textDelta' }>,
  mappingState: MappingState,
): AgentMapping<MappingState> => {
  if (message.params.itemId in mappingState.summaryIndexes)
    return dropped(mappingState);
  return appendText({
    id: message.params.itemId,
    text: message.params.delta,
    field: messageTextField,
    mappingState,
  });
};

const startTurnMapping = (
  vendorTurnId: string,
  mappingState: MappingState,
): MappingState => ({
  ...mappingState,
  vendorTurnId,
  startingUsage: mappingState.totalUsage,
  openRows: {},
  summaryIndexes: {},
  toolMetadata: {},
});
