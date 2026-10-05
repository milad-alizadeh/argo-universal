import { z } from 'zod';

// Shapes of the SDK messages the adapter reads; each schema checks only the fields it uses.

const TextBlock = z.object({ type: z.literal('text'), text: z.string() });
const ThinkingBlock = z.object({
  type: z.literal('thinking'),
  thinking: z.string(),
});
export const ToolUseBlock = z.object({
  type: z.literal('tool_use'),
  id: z.string(),
  name: z.string(),
  input: z.record(z.string(), z.unknown()),
});
export type ToolUseBlock = z.infer<typeof ToolUseBlock>;

// Blocks that take a place in `message.content` but that Argo does not show yet.
const HiddenBlock = z.object({
  type: z.enum([
    'redacted_thinking',
    'server_tool_use',
    'web_search_tool_result',
    'web_fetch_tool_result',
  ]),
});

export const AssistantBlock = z.discriminatedUnion('type', [
  TextBlock,
  ThinkingBlock,
  ToolUseBlock,
  HiddenBlock,
]);
export type AssistantBlock = z.infer<typeof AssistantBlock>;

export const AssistantMessage = z.object({
  type: z.literal('assistant'),
  message: z.object({ id: z.string(), content: z.array(AssistantBlock) }),
});

export const ToolResultBlock = z.object({
  type: z.literal('tool_result'),
  tool_use_id: z.string(),
  content: z
    .union([
      z.string(),
      z.array(z.looseObject({ type: z.string(), text: z.string().optional() })),
    ])
    .optional(),
  is_error: z.boolean().optional(),
});
export type ToolResultBlock = z.infer<typeof ToolResultBlock>;

export const UserMessage = z.object({
  type: z.literal('user'),
  message: z.object({
    content: z.union([
      z.string(),
      z.array(z.looseObject({ type: z.string() })),
    ]),
  }),
  isReplay: z.boolean().optional(),
  tool_use_result: z.unknown().optional(),
  tool_result_meta: z
    .array(z.object({ id: z.string(), non_execution_kind: z.string() }))
    .optional(),
});
export type UserMessage = z.infer<typeof UserMessage>;

const ContentBlockStart = z.object({
  type: z.literal('content_block_start'),
  index: z.int(),
  content_block: z.looseObject({ type: z.string() }),
});

export const StreamEvent = z.object({
  type: z.literal('stream_event'),
  event: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('message_start'),
      message: z.object({ id: z.string() }),
    }),
    ContentBlockStart,
    z.object({
      type: z.literal('content_block_delta'),
      index: z.int(),
      delta: z.looseObject({
        type: z.string(),
        text: z.string().optional(),
        thinking: z.string().optional(),
      }),
    }),
    z.object({
      type: z.enum([
        'content_block_stop',
        'message_delta',
        'message_stop',
        'ping',
      ]),
    }),
  ]),
});

export const ResultMessage = z.object({
  type: z.literal('result'),
  subtype: z.string(),
  is_error: z.boolean(),
  stop_reason: z.string().nullish(),
  terminal_reason: z.string().optional(),
  result: z.string().optional(),
  errors: z.array(z.string()).optional(),
  usage: z.object({
    input_tokens: z.int(),
    output_tokens: z.int(),
    cache_read_input_tokens: z.int().nullish(),
    cache_creation_input_tokens: z.int().nullish(),
    output_tokens_details: z
      .object({ thinking_tokens: z.int().optional() })
      .nullish(),
  }),
});
export type ResultMessage = z.infer<typeof ResultMessage>;

const withUuid = { uuid: z.string() };

export const NoticeMessage = z.discriminatedUnion('subtype', [
  z.object({
    type: z.literal('system'),
    subtype: z.literal('api_retry'),
    attempt: z.int(),
    max_retries: z.int(),
    retry_delay_ms: z.int(),
    ...withUuid,
  }),
  z.object({
    type: z.literal('system'),
    subtype: z.literal('local_command_output'),
    content: z.string(),
    ...withUuid,
  }),
  z.object({
    type: z.literal('system'),
    subtype: z.literal('informational'),
    content: z.string(),
    level: z.enum(['info', 'notice', 'suggestion', 'warning']),
    ...withUuid,
  }),
  z.object({
    type: z.literal('system'),
    subtype: z.literal('notification'),
    text: z.string(),
    ...withUuid,
  }),
  z.object({
    type: z.literal('system'),
    subtype: z.literal('hook_response'),
    hook_name: z.string(),
    outcome: z.enum(['success', 'error', 'cancelled']),
    stderr: z.string(),
    ...withUuid,
  }),
]);
export type NoticeMessage = z.infer<typeof NoticeMessage>;

// Message types the CLI sends that Argo does not show.
export const hiddenTypes = new Set([
  'auth_status',
  'command_lifecycle',
  'conversation_reset',
  'keep_alive',
  'prompt_suggestion',
  'rate_limit_event',
  'tool_progress',
  'tool_use_summary',
]);

// System subtypes the CLI sends that Argo does not show.
export const hiddenSystemSubtypes = new Set([
  'background_tasks_changed',
  'commands_changed',
  'compact_boundary',
  'control_request_progress',
  'elicitation_complete',
  'files_persisted',
  'hook_progress',
  'hook_started',
  'init',
  'memory_recall',
  'mirror_error',
  'model_refusal_fallback',
  'model_refusal_no_fallback',
  'permission_denied',
  'plugin_install',
  'session_state_changed',
  'status',
  'task_notification',
  'task_progress',
  'task_started',
  'task_updated',
  'thinking_tokens',
  'worker_shutting_down',
]);

// The fields every message is sorted by.
export const MessageHeader = z.object({
  type: z.string(),
  subtype: z.string().optional(),
  parent_tool_use_id: z.string().nullish(),
});
