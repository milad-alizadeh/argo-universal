import type {
  AgentMessageDeltaNotification,
  CommandExecutionOutputDeltaNotification,
  ItemCompletedNotification,
  ItemStartedNotification,
  ReasoningSummaryTextDeltaNotification,
  ReasoningTextDeltaNotification,
  ThreadTokenUsageUpdatedNotification,
  TurnCompletedNotification,
  TurnStartedNotification,
} from './protocol.gen';

// The notification families this first-Turn adapter maps; other families are dropped (ADR-0015).
export type VendorMessage = ReceivedMessage &
  (
    | { method: 'turn/started'; params: TurnStartedNotification }
    | { method: 'turn/completed'; params: TurnCompletedNotification }
    | { method: 'item/started'; params: ItemStartedNotification }
    | { method: 'item/completed'; params: ItemCompletedNotification }
    | {
        method: 'item/agentMessage/delta';
        params: AgentMessageDeltaNotification;
      }
    | {
        method: 'item/reasoning/summaryTextDelta';
        params: ReasoningSummaryTextDeltaNotification;
      }
    | {
        method: 'item/reasoning/textDelta';
        params: ReasoningTextDeltaNotification;
      }
    | {
        method: 'item/commandExecution/outputDelta';
        params: CommandExecutionOutputDeltaNotification;
      }
    | {
        method: 'thread/tokenUsage/updated';
        params: ThreadTokenUsageUpdatedNotification;
      }
  );

// Receipt time is supplied by the transport, keeping conversion pure when a Tool call has no final item.
interface ReceivedMessage {
  receivedAt?: number;
}
