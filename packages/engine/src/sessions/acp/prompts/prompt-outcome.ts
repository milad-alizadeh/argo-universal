import { RequestError } from '@agentclientprotocol/sdk';
import type { StopReason, TurnError, TurnUsage } from '@repo/contracts';

export type AcpTurnOutcome = {
  stopReason: StopReason;
  usage?: TurnUsage;
  error?: TurnError;
  // The Agent ended the Turn as cancelled after the user denied a Permission request.
  permissionDenied?: true;
};

// A Turn the Agent itself reported cancelled, rather than one the user stopped.
const cancelledByAgent = (stopped: boolean, stopReason: StopReason): boolean =>
  !stopped && stopReason === 'cancelled';

// A cancelled Turn the user did not stop ends as a denial when a Permission request was denied under it.
export const deniedOutcome = (
  stopped: boolean,
  stopReason: StopReason,
  denied: boolean,
): Pick<AcpTurnOutcome, 'permissionDenied'> =>
  denied && cancelledByAgent(stopped, stopReason)
    ? { permissionDenied: true }
    : {};

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
