import type { OperationsDeps } from '../operations';
import type { WorkDeps } from './work';

export { OperationWork, type WorkDeps } from './work';

export type { UserAdmission } from './admission';

export type { WorkExecution } from './execution';

export type { OperationWaitClock } from './clock';

type LiveDeps = Pick<
  OperationsDeps,
  'sessions' | 'controlToken' | 'operationWaitClock' | 'sessionCommandSignal'
>;

// The Engine's wiring: Sessions' work source, its wait clock passed once, and its Session command signal.
export function liveWorkDeps(deps: LiveDeps): WorkDeps {
  return {
    controlToken: deps.controlToken,
    source: deps.sessions.work,
    clock: deps.operationWaitClock,
    stopping: deps.sessionCommandSignal,
  };
}
