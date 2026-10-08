import type {
  ModelInfo,
  SDKControlInitializeResponse,
  SDKControlResponse,
} from '@anthropic-ai/claude-agent-sdk';
import type { ProjectedFields } from '../src/payload-shape.ts';
import {
  arrayOf,
  hasFields,
  isBoolean,
  isRecord,
  isString,
  oneOf,
  optional,
} from '../src/payload-shape.ts';
import type {
  VendorMessage,
  MappedControlRequest,
  MappedUser,
  MappedAssistant,
} from './messages.ts';
import { isVendorMessage } from './payloads.ts';

export type MappedControlResponse = Pick<SDKControlResponse, 'type'> & {
  response: ProjectedFields<
    SDKControlResponse['response'],
    'subtype' | 'request_id' | 'response' | 'error'
  >;
};
export function isControlResponse(
  value: unknown,
): value is MappedControlResponse {
  if (!isRecord(value)) return false;
  if (!hasFields(value, { type: oneOf('control_response') })) return false;
  return acceptsControlResponseBody(value.response);
}
function acceptsControlResponseBody(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.subtype === 'error')
    return hasFields(value, { request_id: isString, error: isString });
  return hasFields(value, {
    subtype: oneOf('success'),
    request_id: isString,
    response: optional(isRecord),
    error: optional(isString),
  });
}
export const isRecordedFrame = (
  value: unknown,
): value is VendorMessage | MappedControlResponse =>
  isVendorMessage(value) || isControlResponse(value);
export const isControlRequest = (
  value: unknown,
): value is MappedControlRequest =>
  isVendorMessage(value) && value.type === 'control_request';
export const isUserMessage = (value: unknown): value is MappedUser =>
  isVendorMessage(value) && value.type === 'user' && !('isReplay' in value);
export const isAssistantMessage = (value: unknown): value is MappedAssistant =>
  isVendorMessage(value) && value.type === 'assistant';
export interface WireFrame extends Record<string, unknown> {
  type: string;
  emittedAtMs?: number;
}
export const isWireFrame = (value: unknown): value is WireFrame =>
  hasFields(value, {
    type: isString,
    emittedAtMs: optional((time): boolean => typeof time === 'number'),
  });
const modelFields = {
  value: isString,
  displayName: isString,
  description: isString,
  resolvedModel: optional(isString),
  supportsEffort: optional(isBoolean),
  supportedEffortLevels: optional(
    arrayOf(
      (
        level,
      ): level is NonNullable<ModelInfo['supportedEffortLevels']>[number] =>
        oneOf('low', 'medium', 'high', 'xhigh', 'max')(level),
    ),
  ),
  supportsAdaptiveThinking: optional(isBoolean),
  supportsFastMode: optional(isBoolean),
  supportsAutoMode: optional(isBoolean),
};
const isModel = (value: unknown): value is ModelInfo =>
  hasFields(value, modelFields);
export const isInitializeResponse = (
  value: unknown,
): value is Pick<SDKControlInitializeResponse, 'models' | 'account'> =>
  hasFields(value, {
    models: arrayOf(isModel),
    account: isAccountInfo,
    commands: Array.isArray,
    agents: Array.isArray,
    output_style: isString,
    available_output_styles: arrayOf(isString),
  });

const accountFields = {
  email: optional(isString),
  organization: optional(isString),
  subscriptionType: optional(isString),
  tokenSource: optional(isString),
  apiKeySource: optional(isString),
  apiProvider: optional(
    oneOf(
      'firstParty',
      'bedrock',
      'vertex',
      'foundry',
      'anthropicAws',
      'anthropicGoogleCloud',
      'mantle',
      'gateway',
    ),
  ),
};
const isAccountInfo = (
  value: unknown,
): value is import('@anthropic-ai/claude-agent-sdk').AccountInfo =>
  hasFields(value, accountFields);
