import type { OperationExecution } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';
import type { SessionWorkSource } from '../sessions';
import type { StartedWork } from './native-start';
import { admissionTimedOut, type WaitBudget } from './wait-budget';
import type { WaitIds } from './wait-id';
import { readOperationWork } from './work-reader';

type AdmissionContext = {
  source: SessionWorkSource;
  ids: WaitIds;
  budget: WaitBudget;
};

export type BeginWork<Result> = (
  signal: AbortSignal,
) => Promise<StartedWork<Result>>;

type Admission<Result> = { started?: StartedWork<Result> };

const user = { kind: 'user' as const };

// The user gets a wait id at once for a new Session, and for a Turn once it is admitted within the budget.
export function admitUserWork<Result>(
  context: AdmissionContext,
  begin: BeginWork<Result>,
): Promise<Result | OperationExecution> {
  const admission: Admission<Result> = {};

  return context.budget.guard(
    async (signal) => {
      admission.started = await begin(signal);

      return admitted(context, admission.started);
    },
    () => expired(context, admission),
  );
}

async function admitted<Result>(
  context: AdmissionContext,
  started: StartedWork<Result>,
): Promise<Result | OperationExecution> {
  if (started.kind === 'creation') return execution(context, started);

  const accepted = await started.accepted();

  return accepted.turnId === undefined
    ? accepted.result
    : execution(context, started);
}

// A Turn still being admitted when the budget ends is followed by its wait id, once it exists.
function expired<Result>(
  context: AdmissionContext,
  { started }: Admission<Result>,
): OperationExecution {
  if (!started) return admissionTimedOut();

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
  { kind, sessionId, turnId }: StartedWork<unknown>,
): OperationExecution {
  const work = { kind, sessionId, entityId: turnId };

  return readOperationWork(
    { source, ids, caller: user },
    { id: ids.issue(user, work), work },
  ).execution;
}
