import type { AnyActorRef } from 'xstate';
import { isMachineActor } from '../../lib/machine-actor';
import {
  type AgentProbeActorRef,
  agentProbeMachine,
} from './agent-probe-machine';

export const agentProbeId = (agent: string): string => `agentProbe:${agent}`;

export function findAgentProbe(
  system: AnyActorRef['system'],
  agent: string,
): AgentProbeActorRef | undefined {
  const actor = system.get(agentProbeId(agent));
  return isMachineActor(actor, agentProbeMachine) ? actor : undefined;
}
