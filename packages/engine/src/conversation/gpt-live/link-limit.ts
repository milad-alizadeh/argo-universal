import { z } from 'zod';
import type { ConversationProviderEvent } from '../provider';

// The allowance's standing in a usage report; both fields stayed null on every recorded call (#2405).
const usageLimit = z
  .looseObject({
    status: z.string().nullable(),
    reset_seconds: z
      .number()
      .nullish()
      .transform((seconds) => seconds ?? null),
  })
  .nullish()
  .transform((limit) => limit ?? { status: null, reset_seconds: null });

type UsageLimit = z.infer<typeof usageLimit>;

// The usage report the service sends every fifteen seconds; it counts audio time, not tokens.
export const usageReport = z.looseObject({
  type: z.literal('session.usage.updated'),
  usage_limit: usageLimit,
});

const secondMs = 1000;

const resetsAt = (resetSeconds: number): string =>
  new Date(Date.now() + resetSeconds * secondMs).toISOString();

// The service gives the allowance's standing, not how much is left: any status means none to count on.
const limitOf = ({ reset_seconds: seconds }: UsageLimit): ConversationProviderEvent =>
  seconds === null
    ? { type: 'limit', remaining: 0 }
    : { type: 'limit', remaining: 0, resetsAt: resetsAt(seconds) };

// A usage report reads as a limit while its allowance has a status, and as nothing otherwise.
export const usageUpdated = usageReport.transform(
  ({ usage_limit: limit }): ConversationProviderEvent[] =>
    limit.status === null ? [] : [limitOf(limit)],
);
