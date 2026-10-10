import type {
  SDKControlRequest,
  SDKMessage,
} from '@anthropic-ai/claude-agent-sdk';

export type {
  SDKAssistantMessage,
  SDKControlRequest,
  SDKMessage,
  SDKResultMessage,
  SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';

export type VendorMessage = (SDKMessage | SDKControlRequest) & {
  receivedAt?: number;
};
