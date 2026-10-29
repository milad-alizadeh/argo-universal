import type { OperationExecution } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';
import type { SessionWorkSource } from '../../sessions';
import { answer, type RunAnswer } from '../implementations';
import type { StartedWork } from '../native-start';
import { admissionTimedOut } from './clock';
import type { WaitIds } from './ids';
import { nativeWork, readOperationWork } from './reader';
import type { WorkAdmission } from './wait.machine';

type AdmissionContext = { source: SessionWorkSource; ids: WaitIds };

export type BeginWork<Result> = (
  signal: AbortSignal,
) => Promise<StartedWork<Result>>;

// A user's native start, admitted under its run's deadline.
export type UserAdmission = {
  admit: <Result>(begin: BeginWork<Result>) => Promise<RunAnswer<Result>>;
};

const user = { kind: 'user' as const };

// The user gets a wait id at once for a new Session, and for a Turn once it is admitted within the deadline.
export function userAdmission(
  context: AdmissionContext,
  admission: WorkAdmission,
): UserAdmission {
  return {
    admit: async (begin) => {
      const started = await begin(admission.signal);
      admission.started(() => expired(context, started));

      return admitted(context, started);
    },
  };
}

async function admitted<Result>(
  context: AdmissionContext,
  started: StartedWork<Result>,
): Promise<RunAnswer<Result>> {
  if (started.kind === 'creation') return execution(context, started);

  const accepted = await started.accepted();

  return accepted.turnId === undefined
    ? answer(accepted.result)
    : execution(context, started);
}

// A Turn still being admitted when the deadline passes is followed by its wait id, once it exists.
function expired<Result>(
  context: AdmissionContext,
  started: StartedWork<Result>,
): OperationExecution {
  try {
    return execution(context, started);
  } catch (cause) {
    return missingAdmission(cause);
  }
}

function missingAdmission(cause: unknown): never {
  if (!(cause instanceof TRPCError)) throw cause;

  if (cause.code !== 'NOT_FOUND') throw cause;

  return admissionTimedOut();
}

function execution(
  { source, ids }: AdmissionContext,
  started: StartedWork<unknown>,
): OperationExecution {
  const work = nativeWork(started);

  return readOperationWork(
    { source, ids, caller: user },
    { id: ids.issue(user, work), work },
  ).execution;
}
