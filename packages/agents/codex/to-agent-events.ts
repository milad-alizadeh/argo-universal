import { rejectAgentMessage } from '../src/agent-adapter';
import type { AgentMapping } from '../src/agent-adapter';
import { type MappingState, dropped } from './mapping-state';
import type { VendorMessage } from './messages';
import {
  type NotificationHandler,
  turnStarted,
  turnCompleted,
  itemStarted,
  itemCompleted,
  agentMessageDelta,
  commandOutputDelta,
  reasoningTextDelta,
} from './notification-events';
import { toRequestEvents } from './request-events';
import {
  reasoningSummaryDelta,
  tokenUsageUpdated,
} from './usage-and-reasoning-events';
export { type MappingState, initialMappingState } from './mapping-state';
const requestEvent: NotificationHandler = (
  message,
  mappingState,
): AgentMapping<MappingState> => ({
  events: toRequestEvents(message),
  mappingState,
});
const handlers = {
  'turn/started': turnStarted,
  'turn/completed': turnCompleted,
  'item/started': itemStarted,
  'item/completed': itemCompleted,
  'item/agentMessage/delta': agentMessageDelta,
  'item/commandExecution/outputDelta': commandOutputDelta,
  'item/reasoning/summaryTextDelta': reasoningSummaryDelta,
  'item/reasoning/textDelta': reasoningTextDelta,
  'thread/tokenUsage/updated': tokenUsageUpdated,
  'item/tool/requestUserInput': requestEvent,
  'item/fileChange/requestApproval': requestEvent,
  'item/commandExecution/requestApproval': requestEvent,
} satisfies Record<VendorMessage['method'], NotificationHandler>;
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
  if (!Object.hasOwn(handlers, message.method))
    return rejectAgentMessage(mappingState);
  const handler = handlers[message.method];
  return mapRecognised(message, mappingState, handler);
}
const mapRecognised = (
  message: VendorMessage,
  mappingState: MappingState,
  handler: NotificationHandler,
): AgentMapping<MappingState> => {
  if (isTurnIndependent(message, mappingState))
    return handler(message, mappingState);
  return belongsToTurn(message, mappingState)
    ? handler(message, mappingState)
    : dropped(mappingState);
};
