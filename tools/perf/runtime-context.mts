import {
  runtimeClient,
  type RuntimeClient,
  type RuntimeConnection,
} from './runtime-client.mts';
import { RuntimeDeadline } from './runtime-deadline.mts';
import { RuntimeRecord } from './runtime-record.mts';
import type { RuntimeTarget, RuntimeWorkload } from './runtime-types.mts';

/**
 * Preparing a Session is setup, not the work a workload times, so it has its
 * own fixed bound and never spends the workload's timeoutMs.
 */
const prepareTimeoutMs = 10_000;

export interface RuntimeContext {
  target: RuntimeTarget;
  workload: RuntimeWorkload;
  record: RuntimeRecord;
  client: RuntimeClient;
  signal: AbortSignal;
  close: () => void;
  // Starts the workload's timeoutMs once prepare is done and the Turn is about to be dispatched.
  startDeadline: () => void;
  phase: string;
}

function connectionControls(
  deadline: RuntimeDeadline,
  connection: RuntimeConnection,
  timeoutMs: number,
): Pick<RuntimeContext, 'client' | 'signal' | 'close' | 'startDeadline'> {
  return {
    client: connection.client,
    signal: deadline.signal,
    close: () => {
      deadline.stop();
      connection.close();
    },
    startDeadline: () => deadline.restart(timeoutMs),
  };
}

export function runtimeContext(
  target: RuntimeTarget,
  workload: RuntimeWorkload,
): RuntimeContext {
  const deadline = new RuntimeDeadline(prepareTimeoutMs);
  const connection = runtimeClient(target, deadline.signal);

  return {
    target,
    workload,
    ...connectionControls(deadline, connection, workload.timeoutMs),
    phase: 'prepare',
    record: new RuntimeRecord(target.sessionId, workload),
  };
}
