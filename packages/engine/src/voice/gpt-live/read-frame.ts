import { createRejectionCounter } from '@repo/machine-log';
import type { z } from 'zod';

// Reports and counts one frame the reader rejected, with why.
export type RejectFrame = (detail: string, cause: unknown) => void;

// Reports each frame a reader rejects under its label, counting them.
export const frameRejections = (label: string): RejectFrame => {
  const counter = createRejectionCounter(label);

  return (detail, cause) => counter.report(detail, cause);
};

type Issues = z.core.$ZodIssue[];

const isTypeMismatch = ({ code, path }: z.core.$ZodIssue): boolean =>
  code === 'invalid_value' && path.length === 1 && path[0] === 'type';

const refusedForTypeAlone = (issue: z.core.$ZodIssue): boolean =>
  issue.code === 'invalid_union' &&
  issue.errors.every((branch) => branch.some(isTypeMismatch));

// Every event schema refused the frame for its type alone: it is an event the reader does not read.
const namesOtherEvent = ([issue, ...rest]: Issues): boolean =>
  rest.length === 0 && issue !== undefined && refusedForTypeAlone(issue);

function accepted<Value>(
  parsed: z.ZodSafeParseResult<Value>,
  onReject: RejectFrame,
): Value | null {
  if (parsed.success) return parsed.data;

  if (!namesOtherEvent(parsed.error.issues))
    onReject('an unrecognised frame', parsed.error.issues);

  return null;
}

/*
 * Reads one text frame of outside data with `schema` (ADR-0016 §3): a frame that is not JSON, or that the schema
 * rejects, is reported and counted and reads as null. An event of a type no branch of a union schema reads is not
 * Argo's to read, so it reads as null unreported.
 */
export function readFrame<Value>(
  schema: z.ZodType<Value>,
  text: string,
  onReject: RejectFrame,
): Value | null {
  try {
    return accepted(schema.safeParse(JSON.parse(text)), onReject);
  } catch (error) {
    onReject('a frame that is not JSON', error);

    return null;
  }
}
