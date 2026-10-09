import { rejectAgentMessage } from '../src/agent-adapter';
import type { AgentMapping } from '../src/agent-adapter';
import { type MappingState, dropped } from './mapping-state';
import type { VendorMessage } from './messages';
import {
  turnStarted,
  turnCompleted,
  itemStarted,
  itemCompleted,
  agentMessageDelta,
  commandOutputDelta,
  reasoningTextDelta,
} from './notification-events';
import methods from './notification-methods.gen.json' with { type: 'json' };
import { toRequestEvents } from './request-events';
import {
  reasoningSummaryDelta,
  tokenUsageUpdated,
} from './usage-and-reasoning-events';
export { type MappingState, initialMappingState } from './mapping-state';
const isTurnIndependent = (
  message: VendorMessage,
  mappingState: MappingState,
): boolean =>
  message.method === 'turn/started' ||
  (message.method === 'thread/tokenUsage/updated' &&
    mappingState.vendorTurnId === null);
const belongsToTurn = (
  message: VendorMessage,
  mappingState: MappingState,
): boolean => {
  if (message.method === 'turn/completed')
    return message.params.turn.id === mappingState.vendorTurnId;
  return (
    'turnId' in message.params &&
    message.params.turnId === mappingState.vendorTurnId
  );
};
// Raw unknown methods are rejected at the production transport boundary before mapping.
export function toAgentEvents(
  message: VendorMessage,
  mappingState: MappingState,
): AgentMapping<MappingState> {
  if (!methods.handled.includes(message.method))
    return rejectAgentMessage(mappingState);
  return mapCurrentTurn(message, mappingState);
}
const mapCurrentTurn = (
  message: VendorMessage,
  mappingState: MappingState,
): AgentMapping<MappingState> =>
  isTurnIndependent(message, mappingState) ||
  belongsToTurn(message, mappingState)
    ? mapTurnNotification(message, mappingState)
    : dropped(mappingState);
const mapTurnNotification = (
  message: VendorMessage,
  mappingState: MappingState,
): AgentMapping<MappingState> => {
  if (message.method === 'turn/started')
    return turnStarted(message, mappingState);
  if (message.method === 'turn/completed')
    return turnCompleted(message, mappingState);
  return mapItemNotification(message, mappingState);
};
const mapItemNotification = (
  message: VendorMessage,
  mappingState: MappingState,
): AgentMapping<MappingState> => {
  if (message.method === 'item/started')
    return itemStarted(message, mappingState);
  if (message.method === 'item/completed')
    return itemCompleted(message, mappingState);
  return mapTextDelta(message, mappingState);
};
const mapTextDelta = (
  message: VendorMessage,
  mappingState: MappingState,
): AgentMapping<MappingState> => {
  if (message.method === 'item/agentMessage/delta')
    return agentMessageDelta(message, mappingState);
  if (message.method === 'item/commandExecution/outputDelta')
    return commandOutputDelta(message, mappingState);
  return mapReasoningDelta(message, mappingState);
};
const mapReasoningDelta = (
  message: VendorMessage,
  mappingState: MappingState,
): AgentMapping<MappingState> => {
  if (message.method === 'item/reasoning/summaryTextDelta')
    return reasoningSummaryDelta(message, mappingState);
  if (message.method === 'item/reasoning/textDelta')
    return reasoningTextDelta(message, mappingState);
  return mapUsageOrRequest(message, mappingState);
};
const mapUsageOrRequest = (
  message: VendorMessage,
  mappingState: MappingState,
): AgentMapping<MappingState> => {
  if (message.method === 'thread/tokenUsage/updated')
    return tokenUsageUpdated(message, mappingState);
  if ('id' in message)
    return { events: toRequestEvents(message), mappingState };
  return rejectAgentMessage(mappingState);
};
