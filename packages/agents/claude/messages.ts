import type {
  SDKControlRequest,
  SDKMessage,
  SDKAssistantMessage,
  SDKUserMessage,
  SDKUserMessageReplay,
  SDKPartialAssistantMessage,
} from '@anthropic-ai/claude-agent-sdk';
import type { ProjectedFields } from '../src/payload-shape.ts';
import type { MappedResult } from './result-payloads.ts';
import type { MappedSystem } from './system-payloads.ts';

export type {
  AccountInfo,
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

type AssistantContent = SDKAssistantMessage['message']['content'][number];
type UserContent = Exclude<
  SDKUserMessage['message']['content'],
  string
>[number];
type TextContent = ProjectedFields<
  Extract<AssistantContent | UserContent, { type: 'text' | 'thinking' }>,
  'type' | 'text' | 'thinking'
>;
type ToolContent = ProjectedFields<
  Extract<AssistantContent | UserContent, { type: 'tool_use' }>,
  'type' | 'id' | 'name' | 'input'
>;
type ImageContent = ProjectedFields<
  Extract<UserContent, { type: 'image' }>,
  'type' | 'source'
>;
type ResultContent = Extract<UserContent, { type: 'tool_result' }>;
type NestedContent = Exclude<
  NonNullable<ResultContent['content']>,
  string
>[number];
export type MappedContent =
  | TextContent
  | ToolContent
  | ImageContent
  | (Pick<ResultContent, 'type' | 'tool_use_id' | 'is_error'> & {
      content?: string | MappedContent[];
    })
  | ProjectedFields<
      Exclude<
        AssistantContent | UserContent | NestedContent,
        { type: 'text' | 'thinking' | 'tool_use' | 'tool_result' | 'image' }
      >,
      'type'
    >;
export type MappedAssistant = Pick<SDKAssistantMessage, 'type' | 'timestamp'> &
  Partial<Pick<SDKAssistantMessage, 'parent_tool_use_id'>> & {
    message: Pick<SDKAssistantMessage['message'], 'id'> &
      Partial<Pick<SDKAssistantMessage['message'], 'model'>> & {
        content: MappedContent[];
      };
  };
type UserEnvelope = ProjectedFields<
  SDKUserMessage | SDKUserMessageReplay,
  'type' | 'timestamp' | 'isReplay' | 'isSynthetic' | 'tool_use_result'
>;
export type MappedUser = UserEnvelope &
  Partial<Pick<SDKUserMessage, 'parent_tool_use_id'>> & {
    message: { content: string | MappedContent[] };
  };
type Stream = SDKPartialAssistantMessage['event'];
type Delta = Extract<Stream, { type: 'content_block_delta' }>['delta'];
type MappedDelta = ProjectedFields<Delta, 'type' | 'text' | 'thinking'>;
type MappedStream =
  | ProjectedFields<
      Exclude<
        Stream,
        {
          type: 'message_start' | 'content_block_start' | 'content_block_delta';
        }
      >,
      'type'
    >
  | (Pick<Extract<Stream, { type: 'message_start' }>, 'type'> & {
      message: Pick<
        Extract<Stream, { type: 'message_start' }>['message'],
        'id'
      >;
    })
  | (Pick<
      Extract<Stream, { type: 'content_block_start' }>,
      'type' | 'index'
    > & {
      content_block:
        | Extract<MappedContent, { type: 'text' | 'thinking' }>
        | ProjectedFields<
            Exclude<
              Extract<Stream, { type: 'content_block_start' }>['content_block'],
              { type: 'text' | 'thinking' }
            >,
            'type'
          >;
    })
  | (Pick<
      Extract<Stream, { type: 'content_block_delta' }>,
      'type' | 'index'
    > & { delta: MappedDelta });
export type MappedPartialAssistant = Pick<SDKPartialAssistantMessage, 'type'> &
  Partial<Pick<SDKPartialAssistantMessage, 'parent_tool_use_id'>> & {
    event: MappedStream;
  };
export type MappedControlRequest = Pick<
  SDKControlRequest,
  'type' | 'request_id'
> & {
  request:
    | ProjectedFields<
        Extract<SDKControlRequest['request'], { subtype: 'can_use_tool' }>,
        'subtype' | 'tool_name' | 'tool_use_id' | 'input'
      >
    | ProjectedFields<
        Exclude<SDKControlRequest['request'], { subtype: 'can_use_tool' }>,
        'subtype'
      >;
};
export type VendorMessage = (
  | MappedAssistant
  | MappedUser
  | MappedPartialAssistant
  | MappedResult
  | MappedSystem
  | MappedControlRequest
  | ProjectedFields<
      Exclude<
        SDKMessage,
        { type: 'assistant' | 'user' | 'stream_event' | 'result' | 'system' }
      >,
      'type'
    >
) & { receivedAt?: number };
