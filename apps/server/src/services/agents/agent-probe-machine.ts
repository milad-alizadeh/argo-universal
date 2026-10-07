import type { AgentAdapter, AgentProbe } from '@repo/agents';
import { type ActorRefFrom, assign, fromPromise, setup } from 'xstate';

export interface AgentProbeInput {
  adapter: AgentAdapter;
}

interface AgentProbeContext extends AgentProbeInput {
  // The last answer; null until the first probe settles.
  probe: AgentProbe | null;
}

export type AgentProbeEvent = { type: 'agentProbe.refresh' };

// The system id under which each Agent's probe runs.
export const agentProbeId = (agent: string) => `agentProbe:${agent}`;

const probeTimeout = 20_000;
const millisecondsPerSecond = 1000;

// Holds one Agent's last probe, so `agents.list` answers without starting its CLI.
export const agentProbeMachine = setup({
  types: {
    input: {} as AgentProbeInput,
    context: {} as AgentProbeContext,
    events: {} as AgentProbeEvent,
  },
  actors: {
    probe: fromPromise<AgentProbe, AgentAdapter>(({ input, signal }) =>
      input.probe(signal),
    ),
  },
  actions: {
    rememberProbe: assign({
      probe: (_, params: { probe: AgentProbe }) => params.probe,
    }),
    rememberUnavailable: assign({
      probe: ({ context }, params: { reason: string }) => ({
        availability: 'unavailable' as const,
        installStep: `${context.adapter.label} did not start: ${params.reason}`,
        configOptions: [],
      }),
    }),
  },
  delays: { probeTimeout },
}).createMachine({
  id: 'agentProbe',
  context: ({ input }) => ({ ...input, probe: null }),
  initial: 'probing',
  states: {
    // A refresh while probing shares the running probe; leaving aborts it.
    probing: {
      invoke: {
        id: 'probe',
        src: 'probe',
        input: ({ context }) => context.adapter,
        onDone: {
          target: 'probed',
          actions: {
            type: 'rememberProbe',
            params: ({ event }) => ({ probe: event.output }),
          },
        },
        onError: {
          target: 'probed',
          actions: {
            type: 'rememberUnavailable',
            params: ({ event }) => ({
              reason:
                event.error instanceof Error
                  ? event.error.message
                  : String(event.error),
            }),
          },
        },
      },
      after: {
        probeTimeout: {
          target: 'probed',
          actions: {
            type: 'rememberUnavailable',
            params: {
              reason: `no answer within ${probeTimeout / millisecondsPerSecond} seconds`,
            },
          },
        },
      },
    },
    probed: { on: { 'agentProbe.refresh': 'probing' } },
  },
});

export type AgentProbeActorRef = ActorRefFrom<typeof agentProbeMachine>;
