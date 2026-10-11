import { createAgentMetadata } from '@repo/mocks/agent';
import { describe, expect, it } from 'vitest';
import {
  type AnyActorRef,
  createActor,
  createMachine,
  fromTransition,
} from 'xstate';
import { agentProbeId, agentProbeMachine } from '../agents';
import { findMachineActor } from './machine-actor';

const adapter = createAgentMetadata();
const find = (
  system: AnyActorRef['system'],
): ReturnType<typeof findMachineActor> =>
  findMachineActor(system, agentProbeId(adapter.agent), agentProbeMachine);

describe('findMachineActor', (): void => {
  it('finds a probe with supplied implementations', (): void => {
    const probe = createActor(agentProbeMachine.provide({}), {
      systemId: agentProbeId(adapter.agent),
      input: { adapter },
    });
    expect(find(probe.system)).toBe(probe);
  });

  it('rejects an unrelated actor registered under the probe id', (): void => {
    const unrelated = createActor(
      fromTransition((): null => null, null),
      {
        systemId: agentProbeId(adapter.agent),
      },
    );
    expect(find(unrelated.system)).toBeUndefined();
  });

  it('rejects a different machine with the same machine id', (): void => {
    const unrelated = createActor(
      createMachine({
        id: agentProbeMachine.id,
        initial: 'ready',
        states: { ready: {} },
      }),
      { systemId: agentProbeId(adapter.agent) },
    );
    expect(find(unrelated.system)).toBeUndefined();
  });

  it('reports an absent probe', (): void => {
    const probe = createActor(agentProbeMachine, { input: { adapter } });
    expect(find(probe.system)).toBeUndefined();
  });
});
