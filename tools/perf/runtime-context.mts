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
  // Starts the workload's timeoutMs; call once, when prepare is done and the Turn is about to be dispatched.
  startDeadline: () => void;
  phase: string;
}

export function runtimeContext(
  target: RuntimeTarget,
  workload: RuntimeWorkload,
): RuntimeContext {
  const controller = new AbortController();

  const expire = (ms: number): NodeJS.Timeout =>
    setTimeout(() => {
      controller.abort(new DOMException('The operation timed out.', 'TimeoutError'));
    }, ms).unref();

  let timer = expire(prepareTimeoutMs);
  const connection = runtimeClient(target, controller.signal);

  return {
    target,
    workload,
    signal: controller.signal,
    client: connection.client,
    close: () => {
      clearTimeout(timer);
      connection.close();
    },
    startDeadline: () => {
      clearTimeout(timer);
      timer = expire(workload.timeoutMs);
    },
    phase: 'prepare',
    record: new RuntimeRecord(target.sessionId, workload),
  };
}
