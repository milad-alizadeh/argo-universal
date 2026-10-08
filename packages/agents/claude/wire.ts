import type {
  SDKControlResponse,
  SDKControlInitializeResponse,
  SDKControlRequest,
  SDKMessage,
  SDKAssistantMessage,
  SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';
import Ajv from 'ajv';
import schema from './wire-schema.gen.json' with { type: 'json' };

const validator = new Ajv({ strict: false });
const acceptsVendorMessage = validator.compile<SDKMessage | SDKControlRequest>({
  ...schema,
  anyOf: [
    { $ref: '#/definitions/SDKMessage' },
    { $ref: '#/definitions/SDKControlRequest' },
  ],
});
const acceptsWireFrame = validator.compile<
  SDKMessage | SDKControlRequest | SDKControlResponse
>({
  ...schema,
  anyOf: [
    { $ref: '#/definitions/SDKMessage' },
    { $ref: '#/definitions/SDKControlRequest' },
    { $ref: '#/definitions/SDKControlResponse' },
  ],
});
export const isInitializeResponse =
  validator.compile<SDKControlInitializeResponse>({
    ...schema,
    $ref: '#/definitions/SDKControlInitializeResponse',
  });
const acceptsControlRequest = validator.compile<SDKControlRequest>({
  ...schema,
  $ref: '#/definitions/SDKControlRequest',
});
const acceptsControlResponse = validator.compile<SDKControlResponse>({
  ...schema,
  $ref: '#/definitions/SDKControlResponse',
});
export const isUserMessage = (value: unknown): value is SDKUserMessage =>
  isVendorMessage(value) && value.type === 'user' && !('isReplay' in value);
export const isAssistantMessage = (
  value: unknown,
): value is SDKAssistantMessage =>
  isVendorMessage(value) && value.type === 'assistant';
export const isRecordedFrame = acceptsWireFrame;

export const isControlRequest = (value: unknown): value is SDKControlRequest =>
  acceptsControlRequest(value);
export const isControlResponse = (
  value: unknown,
): value is SDKControlResponse => acceptsControlResponse(value);
export type { SDKControlResponse } from '@anthropic-ai/claude-agent-sdk';

export const isVendorMessage = (
  value: unknown,
): value is SDKMessage | SDKControlRequest => acceptsVendorMessage(value);

export function isIgnoredCliExtension(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const fields: Record<string, unknown> = Object.fromEntries(
    Object.entries(value),
  );
  return (
    fields.type === 'command_lifecycle' ||
    (fields.type === 'system' &&
      ['post_turn_summary', 'session_title_changed'].some(
        (subtype): boolean => subtype === fields.subtype,
      ))
  );
}
