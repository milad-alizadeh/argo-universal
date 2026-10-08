import {
  acceptsNamedPayload,
  hasFields,
  isNumber,
  isRecord,
  isString,
  nullable,
  oneOf,
} from '../src/payload-shape.ts';
import type { MappedTurn } from './messages.ts';
import type { CodexErrorInfo } from './protocol.gen.ts';

const errorNames = [
  'contextWindowExceeded',
  'sessionBudgetExceeded',
  'usageLimitExceeded',
  'rateLimitExceeded',
  'serverOverloaded',
  'cyberPolicy',
  'misalignmentPolicyViolation',
  'internalServerError',
  'unauthorized',
  'badRequest',
  'threadRollbackFailed',
  'sandboxError',
  'other',
] as const;
const isHttpDetails = (value: unknown): boolean =>
  hasFields(value, { httpStatusCode: nullable(isNumber) });
const detailPredicates: Record<string, (value: unknown) => boolean> = {
  httpConnectionFailed: isHttpDetails,
  responseStreamConnectionFailed: isHttpDetails,
  responseStreamDisconnected: isHttpDetails,
  responseTooManyFailedAttempts: isHttpDetails,
  activeTurnNotSteerable: (value): boolean =>
    hasFields(value, { turnKind: oneOf('review', 'compact') }),
};
function acceptsErrorDetails(value: Record<string, unknown>): boolean {
  const entries = Object.entries(value);
  if (entries.length !== 1) return false;
  const entry = entries[0];
  if (!entry) return false;
  return acceptsNamedPayload(detailPredicates, entry[0], entry[1]);
}
const isErrorInfo = (value: unknown): value is CodexErrorInfo => {
  if (isString(value))
    return errorNames.some((name): boolean => name === value);
  return isStructuredError(value);
};
function isStructuredError(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return acceptsErrorDetails(value);
}
export const isTurnError = (
  value: unknown,
): value is NonNullable<MappedTurn['error']> =>
  hasFields(value, {
    message: isString,
    codexErrorInfo: nullable(isErrorInfo),
    additionalDetails: nullable(isString),
  });
