import type { SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import type { ProjectedFields } from '../src/payload-shape.ts';
type Usage = SDKResultMessage['usage'];
type MappedUsage = Pick<Usage, 'input_tokens' | 'output_tokens'> &
  Partial<
    Pick<
      Usage,
      | 'cache_read_input_tokens'
      | 'cache_creation_input_tokens'
      | 'output_tokens_details'
    >
  >;
export type MappedResult = ProjectedFields<
  SDKResultMessage,
  'type' | 'subtype' | 'is_error' | 'terminal_reason' | 'result' | 'errors'
> &
  Partial<Pick<SDKResultMessage, 'stop_reason'>> & { usage: MappedUsage };
import {
  arrayOf,
  hasFields,
  isBoolean,
  isNumber,
  isRecord,
  isString,
  nullable,
  oneOf,
  optional,
} from '../src/payload-shape.ts';
const isUsage = (value: unknown): value is MappedUsage =>
  hasFields(value, {
    input_tokens: isNumber,
    output_tokens: isNumber,
    cache_read_input_tokens: optional(isNumber),
    cache_creation_input_tokens: optional(isNumber),
    output_tokens_details: optional((details): boolean =>
      hasFields(details, { thinking_tokens: isNumber }),
    ),
  });
const resultFields = {
  usage: isUsage,
  is_error: isBoolean,
  stop_reason: optional(nullable(isString)),
  terminal_reason: optional(
    oneOf(
      'blocking_limit',
      'rapid_refill_breaker',
      'prompt_too_long',
      'image_error',
      'model_error',
      'api_error',
      'malformed_tool_use_exhausted',
      'aborted_streaming',
      'aborted_tools',
      'stop_hook_prevented',
      'hook_stopped',
      'tool_deferred',
      'max_turns',
      'background_requested',
      'completed',
      'budget_exhausted',
      'structured_output_retry_exhausted',
      'tool_deferred_unavailable',
      'turn_setup_failed',
    ),
  ),
  subtype: oneOf(
    'success',
    'error_during_execution',
    'error_max_turns',
    'error_max_budget_usd',
    'error_max_structured_output_retries',
  ),
};
export function isResult(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!hasFields(value, resultFields)) return false;
  return isResultBody(value);
}
function isResultBody(value: Record<string, unknown>): boolean {
  if (value.subtype === 'success') return isString(value.result);
  return arrayOf(isString)(value.errors);
}
