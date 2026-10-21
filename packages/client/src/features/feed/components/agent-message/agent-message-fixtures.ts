import {
  recordedAgentMessage,
  streamingAgentMessage,
} from '../../../../lib/product/feed-message.mocks';
import type { AgentMessageProps } from './agent-message';

const markdownAnswer = 'markdown-answer';

export const answeredMessage = {
  row: recordedAgentMessage('agent-1', markdownAnswer),
} satisfies AgentMessageProps;

export const streamingMessage = {
  row: streamingAgentMessage('agent-2', markdownAnswer),
} satisfies AgentMessageProps;
