import type { SDKPartialAssistantMessage as PartialMessage } from '@anthropic-ai/claude-agent-sdk';
import type { SDKAssistantMessage, SDKUserMessage } from '../messages';

const base: SDKAssistantMessage = {
  type: 'assistant',
  parent_tool_use_id: null,
  session_id: 'vendor-1',
  uuid: '00000000-0000-0000-0000-000000000001',
  message: {
    model: 'claude-opus-5-5',
    id: 'msg_011CfiGV55PC6jDNmPmEHy8D',
    type: 'message',
    role: 'assistant',
    content: [],
    container: null,
    stop_reason: null,
    stop_sequence: null,
    usage: {
      input_tokens: 2,
      cache_creation_input_tokens: 3953,
      cache_read_input_tokens: 9724,
      cache_creation: {
        ephemeral_5m_input_tokens: 0,
        ephemeral_1h_input_tokens: 3953,
      },
      output_tokens: 10,
      service_tier: 'standard',
      inference_geo: 'not_available',
      fallback_credit: null,
      iterations: null,
      output_tokens_details: null,
      server_tool_use: null,
      speed: null,
    },
    context_management: null,
    stop_details: null,
    diagnostics: null,
    input_transformations: [],
  },
};

export function assistant(
  id: string,
  content: SDKAssistantMessage['message']['content'],
): SDKAssistantMessage {
  return { ...base, message: { ...base.message, id, content } };
}
export function stream(event: PartialMessage['event']): PartialMessage {
  return {
    type: 'stream_event',
    event,
    parent_tool_use_id: null,
    uuid: base.uuid,
    session_id: base.session_id,
  };
}
export function user(
  content: SDKUserMessage['message']['content'],
  result?: SDKUserMessage['tool_use_result'],
  timestamp?: SDKUserMessage['timestamp'],
): SDKUserMessage {
  return {
    type: 'user',
    parent_tool_use_id: null,
    message: { role: 'user', content },
    ...(result === undefined ? {} : { tool_use_result: result }),
    ...(timestamp === undefined ? {} : { timestamp }),
  };
}
