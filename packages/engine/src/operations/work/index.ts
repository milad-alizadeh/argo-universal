import { createSessionWorkSource } from '../../sessions';
import type { OperationsDeps } from '../operations';
import type { WorkDeps } from './work';

export { OperationWork, type WorkDeps } from './work';

export type { WorkAdmission } from './wait.machine';

export type { OperationWaitClock } from './clock';

type LiveDeps = Parameters<typeof createSessionWorkSource>[0] &
  Pick<
    OperationsDeps,
    'controlToken' | 'operationWaitClock' | 'sessionCommandSignal'
  >;

// The Engine's wiring: Sessions' work source, its wait clock passed once, and its Session command signal.
export function liveWorkDeps(deps: LiveDeps): WorkDeps {
  return {
    controlToken: deps.controlToken,
    source: createSessionWorkSource(deps),
    clock: deps.operationWaitClock,
    stopping: deps.sessionCommandSignal,
  };
}
