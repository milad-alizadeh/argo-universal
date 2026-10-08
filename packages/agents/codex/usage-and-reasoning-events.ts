import type { AgentMapping } from '../src/agent-adapter';
import type { AgentEvent } from '../src/agent-events';
import {
  type MappingState,
  dropped,
  feed,
  messageTextField,
  textRow,
  upsert,
} from './mapping-state';
import { subtractUsage } from './mapping-usage';
import type { VendorMessage } from './messages';
import type { NotificationHandler } from './notification-events';
type SummaryMessage = Extract<
  VendorMessage,
  { method: 'item/reasoning/summaryTextDelta' }
>;
type UsageMessage = Extract<
  VendorMessage,
  { method: 'thread/tokenUsage/updated' }
>;
const summaryPrefix = (
  id: string,
  previous: number | undefined,
): AgentEvent[] =>
  previous === undefined
    ? [upsert(textRow({ id, kind: 'agent_thought', text: '', state: 'open' }))]
    : [];
const summaryText = (
  message: SummaryMessage,
  previous: number | undefined,
): string =>
  previous !== undefined && message.params.summaryIndex > previous
    ? `\n\n${message.params.delta}`
    : message.params.delta;
const summaryChanges = (
  message: SummaryMessage,
  previous: number | undefined,
): AgentEvent[] => [
  ...summaryPrefix(message.params.itemId, previous),
  feed({
    type: 'append',
    id: message.params.itemId,
    field: messageTextField,
    text: summaryText(message, previous),
  }),
];
const summaryMapping = (
  message: SummaryMessage,
  mappingState: MappingState,
): AgentMapping<MappingState> => ({
  events: summaryChanges(
    message,
    mappingState.summaryIndexes[message.params.itemId],
  ),
  mappingState: {
    ...mappingState,
    summaryIndexes: summaryIndexes(message, mappingState),
  },
});
export const reasoningSummaryDelta: NotificationHandler = (
  message,
  mappingState,
): AgentMapping<MappingState> => {
  if (message.method !== 'item/reasoning/summaryTextDelta')
    return dropped(mappingState);
  return mappingState.openRows[message.params.itemId] === 'agent_thought'
    ? summaryMapping(message, mappingState)
    : dropped(mappingState);
};
const usageEvents = ({ params: { tokenUsage } }: UsageMessage): AgentEvent[] =>
  tokenUsage.modelContextWindow === null
    ? []
    : [
        {
          type: 'agent.usage',
          usage: {
            used: tokenUsage.last.totalTokens,
            size: tokenUsage.modelContextWindow,
          },
        },
      ];
const usageMapping = (
  message: UsageMessage,
  mappingState: MappingState,
): AgentMapping<MappingState> => ({
  events: usageEvents(message),
  mappingState: {
    ...mappingState,
    totalUsage: message.params.tokenUsage.total,
    startingUsage: startingUsage(message, mappingState),
  },
});
export const tokenUsageUpdated: NotificationHandler = (
  message,
  mappingState,
): AgentMapping<MappingState> => {
  if (message.method !== 'thread/tokenUsage/updated')
    return dropped(mappingState);
  return mappingState.vendorTurnId === null
    ? dropped({ ...mappingState, totalUsage: message.params.tokenUsage.total })
    : usageMapping(message, mappingState);
};

const summaryIndexes = (
  message: SummaryMessage,
  state: MappingState,
): MappingState['summaryIndexes'] => ({
  ...state.summaryIndexes,
  [message.params.itemId]: message.params.summaryIndex,
});
const startingUsage = (
  message: UsageMessage,
  state: MappingState,
): MappingState['startingUsage'] =>
  state.startingUsage ??
  subtractUsage(
    message.params.tokenUsage.total,
    message.params.tokenUsage.last,
  );
