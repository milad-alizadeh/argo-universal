import type { SDKPartialAssistantMessage } from '@anthropic-ai/claude-agent-sdk';
import {
  acceptsNamedPayload,
  hasFields,
  isNumber,
  isBoolean,
  oneOf,
  isRecord,
  isString,
  optional,
} from '../src/payload-shape.ts';
import type { MappedContent } from './messages';
import { acceptsToolInput } from './tool-inputs.ts';

const contentPredicates = {
  text: (value): boolean => hasFields(value, { text: isString }),
  thinking: (value): boolean => hasFields(value, { thinking: isString }),
  tool_use: (value): boolean =>
    hasFields(value, { id: isString, name: isString }) && acceptsTool(value),
  tool_result: (value): boolean =>
    hasFields(value, {
      tool_use_id: isString,
      is_error: optional(isBoolean),
      content: optional(isResultContent),
    }),
  image: (value): boolean => hasFields(value, { source: isImageSource }),
  document: isRecord,
  redacted_thinking: isRecord,
  server_tool_use: isRecord,
  web_search_tool_result: isRecord,
  web_fetch_tool_result: isRecord,
  code_execution_tool_result: isRecord,
  bash_code_execution_tool_result: isRecord,
  text_editor_code_execution_tool_result: isRecord,
  tool_search_tool_result: isRecord,
  container_upload: isRecord,
  tool_reference: isRecord,
  advisor_tool_result: isRecord,
  browser_state: isRecord,
  compaction: isRecord,
  fallback: isRecord,
  mcp_tool_listing: isRecord,
  mcp_tool_result: isRecord,
  mcp_tool_use: isRecord,
  search_result: isRecord,
} satisfies Record<MappedContent['type'], (value: unknown) => boolean>;
function acceptsTool(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return acceptsToolInput(String(value.name), value.input);
}
export function isContentBlock(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!isString(value.type)) return false;
  return acceptsContent(value.type, value);
}
function acceptsContent(name: string, value: unknown): boolean {
  return acceptsNamedPayload(contentPredicates, name, value);
}
export function isBlockContent(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.every(isContentBlock);
}
export const isResultContent = (value: unknown): boolean =>
  typeof value === 'string' || isBlockContent(value);

const deltaPredicates: Record<string, (value: unknown) => boolean> = {
  text_delta: (value): boolean => hasFields(value, { text: isString }),
  thinking_delta: (value): boolean => hasFields(value, { thinking: isString }),
  input_json_delta: (value): boolean =>
    hasFields(value, { partial_json: isString }),
  signature_delta: (value): boolean =>
    hasFields(value, { signature: isString }),
  citations_delta: (value): boolean => hasFields(value, { citation: isRecord }),
};
function isDelta(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!isString(value.type)) return false;
  return acceptsNamedPayload(deltaPredicates, value.type, value);
}
const streamPredicates: Record<string, (value: unknown) => boolean> = {
  message_start: (value): boolean =>
    hasFields(value, {
      message: (message): boolean => hasFields(message, { id: isString }),
    }),
  content_block_start: (value): boolean =>
    hasFields(value, { index: isNumber, content_block: isStartContentBlock }),
  content_block_delta: (value): boolean =>
    hasFields(value, { index: isNumber, delta: isDelta }),
  content_block_stop: (value): boolean => hasFields(value, { index: isNumber }),
  message_delta: isRecord,
  message_stop: isRecord,
};
export function isStreamEvent(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!isString(value.type)) return false;
  return acceptsNamedPayload(streamPredicates, value.type, value);
}

function isImageSource(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.type === 'url') return isString(value.url);
  return hasFields(value, {
    type: oneOf('base64'),
    media_type: oneOf('image/jpeg', 'image/png', 'image/gif', 'image/webp'),
    data: isString,
  });
}

type StartKind = Extract<
  SDKPartialAssistantMessage['event'],
  { type: 'content_block_start' }
>['content_block']['type'];
const startBlockKinds = {
  tool_use: true,
  redacted_thinking: true,
  server_tool_use: true,
  web_search_tool_result: true,
  web_fetch_tool_result: true,
  code_execution_tool_result: true,
  bash_code_execution_tool_result: true,
  text_editor_code_execution_tool_result: true,
  tool_search_tool_result: true,
  container_upload: true,
  advisor_tool_result: true,
  compaction: true,
  fallback: true,
  mcp_tool_listing: true,
  mcp_tool_result: true,
  mcp_tool_use: true,
} satisfies Record<Exclude<StartKind, 'text' | 'thinking'>, true>;
const isKnownStartKind = (
  value: unknown,
): value is Exclude<StartKind, 'text' | 'thinking'> =>
  isString(value) && Object.hasOwn(startBlockKinds, value);
function isStartContentBlock(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (oneOf('text', 'thinking')(value.type)) return isContentBlock(value);
  return isKnownStartKind(value.type);
}
