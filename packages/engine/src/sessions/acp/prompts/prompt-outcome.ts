import { RequestError } from '@agentclientprotocol/sdk';
import type { StopReason, TurnError, TurnUsage } from '@repo/contracts';
import type { AcpSessionLease } from '../../../agents';

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

type ProcessLease = Pick<AcpSessionLease, 'connectionKind' | 'initialization'>;

const resumes = ({ initialization }: ProcessLease): boolean =>
  !!initialization.agentCapabilities?.sessionCapabilities?.resume;

const loads = ({ initialization }: ProcessLease): boolean =>
  !!initialization.agentCapabilities?.loadSession;

const reopens = (lease: ProcessLease): boolean =>
  resumes(lease) || loads(lease);

const endedAuthRequired = (outcome: AcpTurnOutcome | null): boolean =>
  outcome?.stopReason === 'auth_required';

const onOwnProcess = (
  lease: ProcessLease | null | undefined,
): lease is ProcessLease => lease?.connectionKind === 'private';

/*
 * An Agent process can keep a sign-in the Agent has revoked and still answer `authenticate` as signed in (#2031).
 * A Turn that ended `auth_required` on the Session's own process ends that process, so the resend opens the
 * Session on a new one, which reads the sign-in again. A shared process stays: other Sessions run on it.
 */
export const endsStaleProcess = (
  outcome: AcpTurnOutcome | null,
  lease: ProcessLease | null | undefined,
): boolean =>
  endedAuthRequired(outcome) && onOwnProcess(lease) && reopens(lease);
