import type { AgentCheck } from '@repo/contracts';
import { ReadinessSkipped } from '../../readiness/readiness-skipped';
import type { ConfigurationReservations } from './configuration-reservations';

type ReadinessDeps = {
  configuration: ConfigurationReservations;
  installation: (agentId: string) => Promise<void> | undefined;
  isStopped: () => boolean;
};

type ReadinessCheck = (
  agentId: string,
  operation: (signal: AbortSignal) => Promise<AgentCheck>,
) => Promise<AgentCheck>;

const stopping = 'Engine is stopping';

const cancelled = 'Readiness check was cancelled';

// A check stopped by a change to its Agent reports no Readiness.
const skipCancelled = async (
  signal: AbortSignal,
  check: () => Promise<AgentCheck>,
): Promise<AgentCheck> => {
  try {
    return await check();
  } catch (error) {
    if (signal.aborted) throw new ReadinessSkipped(cancelled);

    throw error;
  }
};

export const createInstallationReadiness =
  (deps: ReadinessDeps): ReadinessCheck =>
  (agentId, operation) => {
    if (deps.isStopped()) throw new ReadinessSkipped(stopping);

    return deps.configuration.check(agentId, async (signal) => {
      await deps.installation(agentId);

      if (deps.isStopped()) throw new ReadinessSkipped(stopping);

      return skipCancelled(signal, () => operation(signal));
    });
  };
