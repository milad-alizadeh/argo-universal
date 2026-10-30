import { runtimeClient, type RuntimeClient } from './runtime-client.mts';
import { RuntimeRecord } from './runtime-record.mts';
import type { RuntimeTarget, RuntimeWorkload } from './runtime-types.mts';

// Preparing a Session is setup, not the work a workload times, so it has its own fixed bound
// and never spends the workload's timeoutMs.
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

// Aborts its signal like AbortSignal.timeout, but the clock can be restarted for the next phase.
function phaseDeadline(firstMs: number): {
  signal: AbortSignal;
  restart: (ms: number) => void;
  clear: () => void;
} {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;

  const restart = (ms: number): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      controller.abort(
        new DOMException('The operation timed out.', 'TimeoutError'),
      );
    }, ms).unref();
  };

  restart(firstMs);

  return {
    signal: controller.signal,
    restart,
    clear: () => clearTimeout(timer),
  };
}

export function runtimeContext(
  target: RuntimeTarget,
  workload: RuntimeWorkload,
): RuntimeContext {
  const deadline = phaseDeadline(prepareTimeoutMs);
  const connection = runtimeClient(target, deadline.signal);

  return {
    target,
    workload,
    signal: deadline.signal,
    client: connection.client,
    close: () => {
      deadline.clear();
      connection.close();
    },
    startDeadline: () => deadline.restart(workload.timeoutMs),
    phase: 'prepare',
    record: new RuntimeRecord(target.sessionId, workload),
  };
}
