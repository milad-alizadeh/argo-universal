import {
  acceptsNamedPayload,
  hasFields,
  isRecord,
  isString,
} from '../src/payload-shape.ts';
import type { ThreadResumeParams, TurnInterruptParams } from './protocol.gen';

const inputPredicates: Record<string, (value: unknown) => boolean> = {
  text: (value): boolean => hasFields(value, { text: isString }),
  image: (value): boolean =>
    hasFields(value, { url: isString }) ||
    hasFields(value, { fileId: isString }),
  localImage: (value): boolean => hasFields(value, { path: isString }),
  audio: (value): boolean => hasFields(value, { url: isString }),
  localAudio: (value): boolean => hasFields(value, { path: isString }),
  skill: (value): boolean =>
    hasFields(value, { name: isString, path: isString }),
  mention: (value): boolean =>
    hasFields(value, { name: isString, path: isString }),
};
export function isUserInput(
  value: unknown,
): value is import('./messages').MappedUserInput {
  if (!isRecord(value)) return false;
  if (!isString(value.type)) return false;
  return acceptsNamedPayload(inputPredicates, value.type, value);
}
export const isResumeInput = (
  value: unknown,
): value is Pick<ThreadResumeParams, 'threadId'> =>
  hasFields(value, { threadId: isString });
export const isInterruptInput = (
  value: unknown,
): value is Pick<TurnInterruptParams, 'turnId'> =>
  hasFields(value, { turnId: isString });
