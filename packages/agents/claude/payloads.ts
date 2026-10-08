import {
  acceptsNamedPayload,
  hasFields,
  isBoolean,
  isNumber,
  isRecord,
  isString,
  nullable,
  oneOf,
  optional,
} from '../src/payload-shape.ts';
import { isBlockContent, isStreamEvent } from './content-payloads.ts';
import type { VendorMessage } from './messages.ts';
import { isResult } from './result-payloads.ts';
import { isSystem, isUuid } from './system-payloads.ts';
import { acceptsToolInput } from './tool-inputs.ts';

const isAssistant = (value: unknown): boolean =>
  hasFields(value, {
    message: (message): boolean =>
      hasFields(message, {
        id: isString,
        model: optional(isString),
        content: isBlockContent,
      }),
  });
const isUser = (value: unknown): boolean =>
  hasFields(value, {
    message: (message): boolean =>
      hasFields(message, {
        content: (content): boolean =>
          typeof content === 'string' || isBlockContent(content),
      }),
  });
const isControlRequest = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  return isString(value.request_id) && acceptsControlRequest(value.request);
};
function acceptsControlRequest(request: unknown): boolean {
  if (!isRecord(request)) return false;
  if (request.subtype !== 'can_use_tool')
    return knownControlSubtype(request.subtype);
  return acceptsToolRequest(request);
}
function acceptsToolRequest(request: Record<string, unknown>): boolean {
  return (
    hasFields(request, {
      tool_name: isString,
      tool_use_id: isString,
      input: isRecord,
    }) && acceptsToolInput(String(request.tool_name), request.input)
  );
}
const messagePredicates: Record<string, (value: unknown) => boolean> = {
  assistant: isAssistant,
  user: isUser,
  control_request: isControlRequest,
  result: isResult,
  system: isSystem,
  stream_event: (value): boolean => hasFields(value, { event: isStreamEvent }),
  rate_limit_event: isRecord,
  auth_status: isRecord,
  tool_progress: isRecord,
  tool_use_summary: isRecord,
  prompt_suggestion: isRecord,
  conversation_reset: isRecord,
};

export function isVendorMessage(value: unknown): value is VendorMessage {
  if (!isRecord(value)) return false;
  if (!isMappingEnvelope(value)) return false;
  return acceptsNamedPayload(messagePredicates, String(value.type), value);
}
const isMappingEnvelope = (value: unknown): boolean =>
  hasFields(value, {
    type: isString,
    receivedAt: optional(isNumber),
    timestamp: optional(isString),
    parent_tool_use_id: optional(nullable(isString)),
    isSynthetic: optional(isBoolean),
    isReplay: optional(isBoolean),
  });

// CLI 2.1.286 lifecycle.json and session-title.json record these tags outside SDKMessage.
const isIgnoredSystemExtension = (value: unknown): boolean =>
  hasFields(value, {
    type: oneOf('system'),
    subtype: oneOf('post_turn_summary', 'session_title_changed'),
  });
const isIgnoredCliTag = (value: unknown): boolean =>
  hasFields(value, { type: oneOf('command_lifecycle') }) ||
  isIgnoredSystemExtension(value);
export const isIgnoredCliExtension = (value: unknown): boolean =>
  isMappingEnvelope(value) &&
  hasFields(value, { uuid: isUuid, session_id: isString }) &&
  isIgnoredCliTag(value);

const controlSubtypes = [
  'interrupt',
  'can_use_tool',
  'initialize',
  'set_permission_mode',
  'set_model',
  'set_max_thinking_tokens',
  'rename_session',
  'set_color',
  'mcp_status',
  'get_context_usage',
  'get_session_cost',
  'list_models',
  'get_usage',
  'get_binary_version',
  'mcp_call',
  'file_suggestions',
  'hook_callback',
  'mcp_message',
  'rewind_files',
  'cancel_async_message',
  'read_file',
  'seed_read_state',
  'mcp_set_servers',
  'register_repo_root',
  'reload_plugins',
  'reload_skills',
  'reload_output_styles',
  'mcp_reconnect',
  'mcp_toggle',
  'stop_task',
  'background_tasks',
  'get_task_output',
  'apply_flag_settings',
  'get_settings',
  'get_hooks_listing',
  'update_settings',
  'elicitation',
  'request_user_dialog',
  'list_permission_rules',
  'mcp_read_resource',
] satisfies import('./messages').SDKControlRequest['request']['subtype'][];
function knownControlSubtype(value: unknown): boolean {
  return controlSubtypes.some((subtype): boolean => subtype === value);
}
