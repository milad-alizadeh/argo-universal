import type { AgentCheck } from '@repo/contracts';
import type { ConfigurationReservations } from './configuration-reservations';

type ReadinessDeps = {
  configuration: ConfigurationReservations;
  installation: (agentId: string) => Promise<void> | undefined;
  isStopped: () => boolean;
};
type ReadinessCheck = (
  agentId: string,
  operation: () => Promise<AgentCheck>,
) => Promise<AgentCheck>;
const stopping = 'Engine is stopping';

export const createInstallationReadiness =
  (deps: ReadinessDeps): ReadinessCheck =>
  (agentId, operation) => {
    if (deps.isStopped()) throw new Error(stopping);
    return deps.configuration.check(agentId, async () => {
      await deps.installation(agentId);
      if (deps.isStopped()) throw new Error(stopping);
      return operation();
    });
  };
