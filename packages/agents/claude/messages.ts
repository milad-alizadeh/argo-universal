import type {
  SDKControlRequest,
  SDKMessage,
} from '@anthropic-ai/claude-agent-sdk';

export type {
  PermissionResult,
  SDKAssistantMessage,
  SDKControlInitializeResponse,
  SDKControlRequest,
  SDKControlResponse,
  SDKMessage,
  SDKResultMessage,
  SDKSystemMessage,
  SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';

export type { AskUserQuestionInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';

export type VendorMessage = (SDKMessage | SDKControlRequest) & {
  receivedAt?: number;
};
