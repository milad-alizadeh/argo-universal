import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { ProjectedFields } from '../src/payload-shape.ts';
import {
  acceptsNamedPayload,
  hasFields,
  isNumber,
  isRecord,
  isString,
  oneOf,
  optional,
} from '../src/payload-shape.ts';
type System = Extract<SDKMessage, { type: 'system' }>;
type NoticeKind =
  | 'status'
  | 'compact_boundary'
  | 'api_retry'
  | 'local_command_output'
  | 'informational'
  | 'notification'
  | 'hook_response';
export type MappedSystem =
  | ProjectedFields<
      Extract<System, { subtype: NoticeKind }>,
      | 'type'
      | 'subtype'
      | 'uuid'
      | 'status'
      | 'compact_result'
      | 'attempt'
      | 'max_retries'
      | 'retry_delay_ms'
      | 'content'
      | 'level'
      | 'text'
      | 'outcome'
      | 'hook_name'
      | 'stderr'
    >
  | ProjectedFields<
      Exclude<System, { subtype: NoticeKind }>,
      'type' | 'subtype' | 'uuid'
    >;
const systemPredicates: Record<string, (value: unknown) => boolean> = {
  status: (value): boolean =>
    hasFields(value, {
      status: oneOf('compacting', 'requesting', null),
      compact_result: optional(oneOf('success', 'failed')),
    }),
  compact_boundary: isRecord,
  api_retry: (value): boolean =>
    hasFields(value, {
      attempt: isNumber,
      max_retries: isNumber,
      retry_delay_ms: isNumber,
    }),
  local_command_output: (value): boolean =>
    hasFields(value, { content: isString }),
  informational: (value): boolean =>
    hasFields(value, {
      content: isString,
      level: oneOf('info', 'notice', 'suggestion', 'warning'),
    }),
  notification: (value): boolean => hasFields(value, { text: isString }),
  hook_response: (value): boolean =>
    hasFields(value, {
      outcome: oneOf('success', 'error', 'cancelled'),
      hook_name: isString,
      stderr: isString,
    }),
  init: isRecord,
  files_persisted: isRecord,
  hook_started: isRecord,
  hook_progress: isRecord,
  task_notification: isRecord,
  task_started: isRecord,
  task_updated: isRecord,
  task_progress: isRecord,
  background_tasks_changed: isRecord,
  thinking_tokens: isRecord,
  session_state_changed: isRecord,
  worker_shutting_down: isRecord,
  commands_changed: isRecord,
  memory_recall: isRecord,
  elicitation_complete: isRecord,
  permission_denied: isRecord,
  prompt_suggestion: isRecord,
  mirror_error: isRecord,
  conversation_reset: isRecord,
  control_request_progress: isRecord,
  model_refusal_fallback: isRecord,
  model_refusal_no_fallback: isRecord,
  plugin_install: isRecord,
};
export function isSystem(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!hasFields(value, { subtype: isString, uuid: isUuid })) return false;
  return acceptsNamedPayload(systemPredicates, String(value.subtype), value);
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (
  value: unknown,
): value is Extract<SDKMessage, { type: 'system' }>['uuid'] =>
  isString(value) && uuidPattern.test(value);
