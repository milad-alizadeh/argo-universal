import { FeedSyncPoint } from '@repo/contracts';
import { TRPCClientError } from '@trpc/client';
import { z } from 'zod';

// What `feed.subscribe` took on a Server built before the tail and event ids: a strict `{ sessionId, after }`, answered with plain events.
export const OldSubscribeInput = z.strictObject({
  sessionId: z.string(),
  after: FeedSyncPoint.nullable(),
});

// The bad request such a Server answers a key it does not know with.
export const refusalOf = (error: z.ZodError): TRPCClientError<never> =>
  TRPCClientError.from({
    error: {
      message: error.message,
      code: -32600,
      data: { code: 'BAD_REQUEST', httpStatus: 400 },
    },
  });
