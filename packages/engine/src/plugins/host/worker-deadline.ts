import { runtimeStartupLimitMs } from '../protocol/runtime-limits.ts';
import { pluginAnswerLimitMs } from '../protocol/runtime.ts';

const policies = {
  initializing: {
    limit: runtimeStartupLimitMs,
    error: 'Plugin worker initialization exceeded 10 seconds',
    hanging: false,
  },
  answering: {
    limit: pluginAnswerLimitMs,
    error: 'Plugin did not answer within 3 seconds',
    hanging: true,
  },
};

export type WorkerPhase = keyof typeof policies;

// Platform setup and Plugin execution have separate bounded deadlines.
export function workerDeadline(
  phase: WorkerPhase,
  failed: (error: string, hanging: boolean) => void,
): ReturnType<typeof setTimeout> {
  const { limit, error, hanging } = policies[phase];

  return setTimeout(() => failed(error, hanging), limit);
}
