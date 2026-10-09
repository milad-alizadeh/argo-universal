import type { AgentAdapter } from '@repo/agents';
import type { AgentsListInput, AgentsListOutput } from '@repo/contracts';
import { waitFor } from 'xstate';
import type { RegistryActorRef } from '../sessions';
import type { AgentProbeActorRef } from './agent-probe-machine';
import { findAgentProbe } from './agent-probe-system';

function requireAgentProbe(
  actorSystem: RegistryActorRef['system'],
  adapter: Pick<AgentAdapter, 'agent' | 'label'>,
): AgentProbeActorRef {
  const probeActor = findAgentProbe(actorSystem, adapter.agent);
  if (!probeActor) throw new Error(`No probe for ${adapter.label}`);
  return probeActor;
}

async function readAgentAvailability(
  { agent, label, logo }: Pick<AgentAdapter, 'agent' | 'label' | 'logo'>,
  actorSystem: RegistryActorRef['system'],
  shouldRefresh: boolean | undefined,
): Promise<AgentsListOutput[number]> {
  const probeActor = requireAgentProbe(actorSystem, { agent, label });
  if (shouldRefresh) probeActor.send({ type: 'agentProbe.refresh' });
  const { context: discovery } = await waitFor(
    probeActor,
    (probeSnapshot): boolean => probeSnapshot.matches('probed'),
  );
  if (!discovery.probe) throw new Error(`No probe for ${label}`);
  return { agent, label, logo, ...discovery.probe };
}

export function listAgents(
  sessionRegistry: Pick<RegistryActorRef, 'system' | 'getSnapshot'>,
  availabilityRequest: AgentsListInput,
): Promise<AgentsListOutput> {
  const registeredAdapters = sessionRegistry.getSnapshot().context.adapters;
  return Promise.all(
    registeredAdapters.map((adapter): Promise<AgentsListOutput[number]> =>
      readAgentAvailability(
        adapter,
        sessionRegistry.system,
        availabilityRequest?.refresh,
      ),
    ),
  );
}
