import type { SessionOpenError } from '@repo/contracts';

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
