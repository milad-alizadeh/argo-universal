import type { SessionOpenError } from '@repo/contracts';
import { TRPCClientError } from '@trpc/client';

const closed = (): Error => new Error('Session session-1 closed');

// A refused open as the tRPC client carries it.
export const openFailure = (openError: SessionOpenError): Error =>
  Object.assign(closed(), {
    data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500, openError },
  });

// A Server error that is no open failure, as the tRPC client carries it.
export const serverError: Error = Object.assign(closed(), {
  data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 },
});

// The error a tRPC call or subscription gets when its WebSocket closes under it: no answer from the Server.
export const dropped = TRPCClientError.from(new Error('WebSocket closed'));

// The answer a read gets for an id no Session has, as the tRPC client carries it.
export const sessionNotFound = TRPCClientError.from({
  error: {
    message: 'No Session does-not-exist',
    code: -32_004,
    data: { code: 'NOT_FOUND', httpStatus: 404, path: 'feed.page' },
  },
});
