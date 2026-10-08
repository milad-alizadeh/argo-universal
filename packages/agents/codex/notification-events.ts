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
export type NotificationHandler = (
  message: VendorMessage,
  mappingState: MappingState,
) => AgentMapping<MappingState>;
export const turnStarted: NotificationHandler = (
  message,
  mappingState,
): AgentMapping<MappingState> => {
  if (message.method !== 'turn/started') return dropped(mappingState);
  if (mappingState.vendorTurnId === message.params.turn.id)
    return dropped(mappingState);
  return {
    events: [{ type: 'agent.turnStarted' }],
    mappingState: startTurnMapping(message.params.turn.id, mappingState),
  };
};
export const turnCompleted: NotificationHandler = (
  message,
  mappingState,
): AgentMapping<MappingState> =>
  message.method === 'turn/completed'
    ? endTurn(message.params.turn, mappingState, message.receivedAt)
    : dropped(mappingState);
export const itemStarted: NotificationHandler = (
  message,
  mappingState,
): AgentMapping<MappingState> =>
  message.method === 'item/started'
    ? mapItem({
        item: message.params.item,
        state: 'open',
        mappingState,
        timestamp: message.params.startedAtMs ?? message.receivedAt,
      })
    : dropped(mappingState);
export const itemCompleted: NotificationHandler = (
  message,
  mappingState,
): AgentMapping<MappingState> =>
  message.method === 'item/completed'
    ? mapItem({
        item: message.params.item,
        state: 'settled',
        mappingState,
        timestamp: message.params.completedAtMs ?? message.receivedAt,
      })
    : dropped(mappingState);
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
export const agentMessageDelta: NotificationHandler = (
  message,
  mappingState,
): AgentMapping<MappingState> =>
  message.method === 'item/agentMessage/delta'
    ? appendText({
        id: message.params.itemId,
        text: message.params.delta,
        field: messageTextField,
        mappingState,
      })
    : dropped(mappingState);
export const commandOutputDelta: NotificationHandler = (
  message,
  mappingState,
): AgentMapping<MappingState> =>
  message.method === 'item/commandExecution/outputDelta'
    ? appendText({
        id: message.params.itemId,
        text: message.params.delta,
        field: 'content.0.output',
        mappingState,
      })
    : dropped(mappingState);
export const reasoningTextDelta: NotificationHandler = (
  message,
  mappingState,
): AgentMapping<MappingState> => {
  if (message.method !== 'item/reasoning/textDelta')
    return dropped(mappingState);
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
