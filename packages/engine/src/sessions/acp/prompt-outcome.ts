import { RequestError } from '@agentclientprotocol/sdk';
import type { StopReason, TurnError, TurnUsage } from '@repo/contracts';

export type AcpTurnOutcome = {
  stopReason: StopReason;
  usage?: TurnUsage;
  error?: TurnError;
};

const promptError = (cause: unknown): TurnError =>
  cause instanceof RequestError
    ? { code: cause.code, message: cause.message, data: cause.data }
    : { code: 'interrupted', message: String(cause) };

export const promptFailureOutcome = (
  cancelled: boolean,
  cause: unknown,
): AcpTurnOutcome => {
  if (cancelled) return { stopReason: 'cancelled' };
  const error = promptError(cause);

  return {
    stopReason:
      error.code === RequestError.authRequired().code
        ? 'auth_required'
        : 'error',
    error,
  };
};
