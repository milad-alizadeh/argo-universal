import type {
  CommandExecutionRequestApprovalParams,
  CommandExecutionRequestApprovalResponse,
  FileChangeRequestApprovalParams,
  FileChangeRequestApprovalResponse,
  RequestId,
  ServerNotification,
  ToolRequestUserInputParams,
  ToolRequestUserInputResponse,
} from './protocol.gen';

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

export type VendorRequest = {
  [Method in keyof VendorRequests]: {
    method: Method;
    id: RequestId;
    params: VendorRequests[Method][0];
  };
}[keyof VendorRequests];

// The notification families this first-Turn adapter maps; other families are dropped (ADR-0015).
export type VendorMessage = ReceivedMessage &
  (
    | VendorRequest
    | Extract<
        ServerNotification,
        {
          method:
            | 'turn/started'
            | 'turn/completed'
            | 'item/started'
            | 'item/completed'
            | 'item/agentMessage/delta'
            | 'item/reasoning/summaryTextDelta'
            | 'item/reasoning/textDelta'
            | 'item/commandExecution/outputDelta'
            | 'thread/tokenUsage/updated';
        }
      >
  );

// Receipt time is supplied by the transport, keeping conversion pure when a Tool call has no final item.
interface ReceivedMessage {
  receivedAt?: number;
}
