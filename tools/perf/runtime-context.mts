import { runtimeClient, type RuntimeClient } from './runtime-client.mts';
import { RuntimeRecord } from './runtime-record.mts';
import type { RuntimeTarget, RuntimeWorkload } from './runtime-types.mts';

export interface RuntimeContext {
  target: RuntimeTarget;
  workload: RuntimeWorkload;
  record: RuntimeRecord;
  client: RuntimeClient;
  signal: AbortSignal;
  close: () => void;
  phase: string;
}

export function runtimeContext(
  target: RuntimeTarget,
  workload: RuntimeWorkload,
): RuntimeContext {
  const signal = AbortSignal.timeout(workload.timeoutMs);
  const connection = runtimeClient(target, signal);

  return {
    target,
    workload,
    signal,
    ...connection,
    phase: 'prepare',
    record: new RuntimeRecord(target.sessionId, workload),
  };
}
