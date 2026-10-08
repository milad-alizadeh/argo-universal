import {
  acceptsNamedPayload,
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
import { isThreadItem } from './item-payloads.ts';
import type { MappedTurn, VendorMessage } from './messages.ts';
import { isIgnoredNotification } from './notification-kinds.ts';
import type {
  TokenUsageBreakdown,
  ToolRequestUserInputParams,
} from './protocol.gen';
import { isTurnError } from './turn-error-payload.ts';

export const isUsage = (value: unknown): value is TokenUsageBreakdown =>
  hasFields(value, {
    totalTokens: isNumber,
    inputTokens: isNumber,
    cachedInputTokens: isNumber,
    cacheWriteInputTokens: isNumber,
    outputTokens: isNumber,
    reasoningOutputTokens: isNumber,
  });
export const isTurn = (value: unknown): value is MappedTurn =>
  hasFields(value, {
    id: isString,
    status: oneOf('completed', 'interrupted', 'failed', 'inProgress'),
    error: nullable(isTurnError),
  });
type Question = ToolRequestUserInputParams['questions'][number];
const isOption = (
  value: unknown,
): value is NonNullable<Question['options']>[number] =>
  hasFields(value, { label: isString, description: isString });
const isQuestion = (value: unknown): value is Question =>
  hasFields(value, {
    id: isString,
    header: isString,
    question: isString,
    isOther: isBoolean,
    isSecret: isBoolean,
    options: nullable(arrayOf(isOption)),
  });
const messageIdentity = { threadId: isString, turnId: isString };
const itemIdentity = { ...messageIdentity, itemId: isString };
const isTurnNotification = (value: unknown): boolean =>
  hasFields(value, { threadId: isString, turn: isTurn });
const isItemNotification = (value: unknown): boolean =>
  hasFields(value, {
    ...messageIdentity,
    item: isThreadItem,
    startedAtMs: optional(isNumber),
    completedAtMs: optional(isNumber),
  });
const isDelta = (value: unknown): boolean =>
  hasFields(value, { ...itemIdentity, delta: isString });
const isSummaryDelta = (value: unknown): boolean =>
  hasFields(value, {
    ...itemIdentity,
    delta: isString,
    summaryIndex: isNumber,
  });
const isUsageNotification = (value: unknown): boolean =>
  hasFields(value, {
    ...messageIdentity,
    tokenUsage: (usage): boolean =>
      hasFields(usage, {
        total: isUsage,
        last: isUsage,
        modelContextWindow: nullable(isNumber),
      }),
  });
const isApproval = (value: unknown): boolean =>
  hasFields(value, {
    ...itemIdentity,
    command: optional(nullable(isString)),
    reason: optional(nullable(isString)),
  });
const isQuestionRequest = (value: unknown): boolean =>
  hasFields(value, {
    ...itemIdentity,
    questions: arrayOf(isQuestion),
    isBlocking: isBoolean,
  });
const notificationPredicates = {
  'turn/started': isTurnNotification,
  'turn/completed': isTurnNotification,
  'item/started': isItemNotification,
  'item/completed': isItemNotification,
  'item/agentMessage/delta': isDelta,
  'item/commandExecution/outputDelta': isDelta,
  'item/reasoning/summaryTextDelta': isSummaryDelta,
  'item/reasoning/textDelta': isDelta,
  'thread/tokenUsage/updated': isUsageNotification,
  'item/commandExecution/requestApproval': isApproval,
  'item/fileChange/requestApproval': isApproval,
  'item/tool/requestUserInput': isQuestionRequest,
} satisfies Record<string, (value: unknown) => boolean>;
export function isVendorMessage(value: unknown): value is VendorMessage {
  if (!isMessageEnvelope(value)) return false;
  return (
    acceptsVendorMessage(value) ||
    isIgnoredNotification(value, notificationPredicates)
  );
}
function acceptsVendorMessage(value: Record<string, unknown>): boolean {
  return (
    hasFields(value, { method: isString, receivedAt: optional(isNumber) }) &&
    acceptsRequestId(value) &&
    acceptsNamedPayload(
      notificationPredicates,
      String(value.method),
      value.params,
    )
  );
}

const requestMethods = new Set([
  'item/commandExecution/requestApproval',
  'item/fileChange/requestApproval',
  'item/tool/requestUserInput',
]);
function acceptsRequestId(value: Record<string, unknown>): boolean {
  if (!requestMethods.has(String(value.method))) return true;
  return oneOfRequestId(value.id);
}
function oneOfRequestId(value: unknown): boolean {
  return isString(value) || isNumber(value);
}

const isMessageEnvelope = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && optional(isNumber)(value.receivedAt);
