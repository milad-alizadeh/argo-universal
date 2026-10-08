import type { UnmappedNotification } from './notification-kinds.ts';
import type {
  AgentMessageDeltaNotification,
  CommandExecutionOutputDeltaNotification,
  CommandExecutionRequestApprovalParams,
  CommandExecutionRequestApprovalResponse,
  FileChangeRequestApprovalParams,
  FileChangeRequestApprovalResponse,
  ItemCompletedNotification,
  ItemStartedNotification,
  ReasoningSummaryTextDeltaNotification,
  ReasoningTextDeltaNotification,
  ThreadItem,
  ThreadTokenUsageUpdatedNotification,
  ToolRequestUserInputParams,
  ToolRequestUserInputResponse,
  Turn,
  TurnCompletedNotification,
  TurnStartedNotification,
  UserInput,
} from './protocol.gen';

type Fields<Value, Keys extends PropertyKey> = Value extends unknown
  ? Pick<Value, Extract<keyof Value, Keys>>
  : never;
export type MappedUserInput = Fields<
  UserInput,
  'type' | 'text' | 'url' | 'fileId' | 'path' | 'name'
>;
export type MappedTurn = Pick<Turn, 'id' | 'status'> & {
  error: Pick<
    NonNullable<Turn['error']>,
    'message' | 'codexErrorInfo' | 'additionalDetails'
  > | null;
};
type ItemFields =
  | 'type'
  | 'id'
  | 'text'
  | 'summary'
  | 'content'
  | 'command'
  | 'cwd'
  | 'status'
  | 'commandActions'
  | 'aggregatedOutput'
  | 'exitCode'
  | 'durationMs'
  | 'changes';
type MappedItemKind =
  | 'agentMessage'
  | 'plan'
  | 'reasoning'
  | 'commandExecution'
  | 'fileChange';
type ItemWithoutPrompt =
  | Fields<Extract<ThreadItem, { type: MappedItemKind }>, ItemFields>
  | Fields<
      Exclude<ThreadItem, { type: MappedItemKind | 'userMessage' }>,
      'type' | 'id'
    >;
export type MappedThreadItem =
  | ItemWithoutPrompt
  | (Pick<Extract<ThreadItem, { type: 'userMessage' }>, 'type' | 'id'> & {
      content: MappedUserInput[];
    });

export interface VendorRequests {
  'item/commandExecution/requestApproval': [
    CommandExecutionRequestApprovalParams,
    CommandExecutionRequestApprovalResponse,
  ];
  'item/fileChange/requestApproval': [
    FileChangeRequestApprovalParams,
    FileChangeRequestApprovalResponse,
  ];
  'item/tool/requestUserInput': [
    ToolRequestUserInputParams,
    ToolRequestUserInputResponse,
  ];
}
type RequestFields =
  | 'threadId'
  | 'turnId'
  | 'itemId'
  | 'command'
  | 'reason'
  | 'questions'
  | 'isBlocking';
export type VendorRequest = {
  [Method in keyof VendorRequests]: {
    method: Method;
    id: string | number;
    params: Fields<VendorRequests[Method][0], RequestFields>;
  };
}[keyof VendorRequests];
type TurnNotification<Notification> = Fields<Notification, 'threadId'> & {
  turn: MappedTurn;
};
type ItemNotification<Notification> = Fields<
  Notification,
  'threadId' | 'turnId'
> & {
  item: MappedThreadItem;
} & Partial<Fields<Notification, 'startedAtMs' | 'completedAtMs'>>;
interface Notifications {
  'turn/started': TurnNotification<TurnStartedNotification>;
  'turn/completed': TurnNotification<TurnCompletedNotification>;
  'item/started': ItemNotification<ItemStartedNotification>;
  'item/completed': ItemNotification<ItemCompletedNotification>;
  'item/agentMessage/delta': AgentMessageDeltaNotification;
  'item/reasoning/summaryTextDelta': ReasoningSummaryTextDeltaNotification;
  'item/reasoning/textDelta': Fields<
    ReasoningTextDeltaNotification,
    'threadId' | 'turnId' | 'itemId' | 'delta'
  >;
  'item/commandExecution/outputDelta': CommandExecutionOutputDeltaNotification;
  'thread/tokenUsage/updated': ThreadTokenUsageUpdatedNotification;
}
export type VendorMessage = { receivedAt?: number } & (
  | VendorRequest
  | UnmappedNotification<keyof Notifications>
  | {
      [Method in keyof Notifications]: {
        method: Method;
        params: Notifications[Method];
      };
    }[keyof Notifications]
);
