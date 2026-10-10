import { createAgentMetadata } from '@repo/mocks/agent';
import { describe, expect, it } from 'vitest';
import { createActor, createMachine, fromTransition } from 'xstate';
import { agentProbeMachine } from './agent-probe-machine';
import { agentProbeId, findAgentProbe } from './agent-probe-system';

const adapter = createAgentMetadata();

describe('Agent probe ownership', (): void => {
  it('finds a probe with supplied implementations', (): void => {
    const probe = createActor(agentProbeMachine.provide({}), {
      systemId: agentProbeId(adapter.agent),
      input: { adapter },
    });
    expect(findAgentProbe(probe.system, adapter.agent)).toBe(probe);
  });

  it('rejects an unrelated actor registered under the probe id', (): void => {
    const unrelated = createActor(
      fromTransition((): null => null, null),
      {
        systemId: agentProbeId(adapter.agent),
      },
    );
    expect(findAgentProbe(unrelated.system, adapter.agent)).toBeUndefined();
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
    expect(findAgentProbe(unrelated.system, adapter.agent)).toBeUndefined();
  });

  it('reports an absent probe', (): void => {
    const probe = createActor(agentProbeMachine, { input: { adapter } });
    expect(findAgentProbe(probe.system, adapter.agent)).toBeUndefined();
  });
});
