import type { AgentsService } from '@repo/api';
import { waitFor } from 'xstate';
import type { RegistryActorRef } from '../sessions';
import { type AgentProbeActorRef, agentProbeId } from './agent-probe-machine';

// Answers from each Agent's last probe; `refresh` probes them all again first.
export function createAgentService(sessions: RegistryActorRef): AgentsService {
  return {
    list: async (input): ReturnType<AgentsService['list']> =>
      Promise.all(
        sessions
          .getSnapshot()
          .context.adapters.map(
            async (
              adapter,
            ): Promise<Awaited<ReturnType<AgentsService['list']>>[number]> => {
              const probe = sessions.system.get(agentProbeId(adapter.agent)) as
                | AgentProbeActorRef
                | undefined;
              if (!probe) throw new Error(`No probe for ${adapter.label}`);
              if (input?.refresh) probe.send({ type: 'agentProbe.refresh' });
              const { context } = await waitFor(probe, (snapshot): boolean =>
                snapshot.matches('probed'),
              );
              if (!context.probe)
                throw new Error(`No probe for ${adapter.label}`);
              return {
                agent: adapter.agent,
                label: adapter.label,
                logo: adapter.logo,
                ...context.probe,
              };
            },
          ),
      ),
  };
}
