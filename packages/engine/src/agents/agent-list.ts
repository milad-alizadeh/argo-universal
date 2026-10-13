import type { AgentAdapter } from '@repo/agents';
import type { AgentsListInput, AgentsListOutput } from '@repo/contracts';
import type { Database } from '@repo/db';
import { waitFor } from 'xstate';
import { findMachineActor } from '../lib/machine-actor';
import type { OpenSessionsActorRef } from '../sessions';
import type { AgentProbeActorRef } from './agent-probe-machine';
import { agentProbeMachine } from './agent-probe-machine';
import { agentProbeId } from './agent-probe-system';
import { readConfiguredAgent } from './configuration/configuration-sql';

function requireAgentProbe(
  actorSystem: OpenSessionsActorRef['system'],
  adapter: Pick<AgentAdapter, 'agent' | 'label'>,
): AgentProbeActorRef {
  const probeActor = findMachineActor(
    actorSystem,
    agentProbeId(adapter.agent),
    agentProbeMachine,
  );
  if (!probeActor) throw new Error(`No probe for ${adapter.label}`);
  return probeActor;
}

async function readAgentAvailability(
  { agent, label, logo }: Pick<AgentAdapter, 'agent' | 'label' | 'logo'>,
  actorSystem: OpenSessionsActorRef['system'],
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

const probedAgents = (
  openSessions: Pick<OpenSessionsActorRef, 'system' | 'getSnapshot'>,
  request: AgentsListInput,
): Promise<AgentsListOutput> =>
  Promise.all(
    openSessions
      .getSnapshot()
      .context.adapters.map((adapter) =>
        readAgentAvailability(adapter, openSessions.system, request?.refresh),
      ),
  );
export async function listAgents(
  openSessions: Pick<OpenSessionsActorRef, 'system' | 'getSnapshot'>,
  request: AgentsListInput,
): Promise<AgentsListOutput> {
  const database = openSessions.getSnapshot().context.database;
  return (await probedAgents(openSessions, request)).map((info) =>
    configuredAvailability(info, database),
  );
}
const unavailableInfo = (
  info: AgentsListOutput[number],
  removed: boolean,
): AgentsListOutput[number] => ({
  ...info,
  availability: removed ? 'not_installed' : 'unavailable',
  installStep: removed
    ? 'Agent was removed. Install it again.'
    : 'Agent is disabled. Enable it to start new Sessions.',
});
function configuredAvailability(
  info: AgentsListOutput[number],
  database: Database,
): AgentsListOutput[number] {
  const configured = readConfiguredAgent(database, info.agent);
  if (configured?.configuration.removed) return unavailableInfo(info, true);
  return configured?.enabled === false ? unavailableInfo(info, false) : info;
}
