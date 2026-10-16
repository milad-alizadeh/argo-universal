import type { SessionOpenError } from '@repo/contracts';

// A refused open as the tRPC client carries it.
export const openFailure = (openError: SessionOpenError): Error =>
  Object.assign(new Error('Session session-1 closed'), {
    data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500, openError },
  });
