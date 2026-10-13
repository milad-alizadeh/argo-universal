import type { SessionDiscovery, SessionDiscoveryInput } from '@repo/contracts';
import {
  assign,
  enqueueActions,
  setup,
  type ActorRefFrom,
  type DoneActorEvent,
} from 'xstate';
import { discoveryMachine, type DiscoveryResult } from './discovery-machine';
import type { OpenSessionsInput } from './open-sessions-machine';

type Completion = Pick<
  PromiseWithResolvers<SessionDiscovery>,
  'resolve' | 'reject'
>;

type Refresh = SessionDiscoveryInput & {
  type: 'discovery.refresh';
  completion?: Completion;
};

type Context = OpenSessionsInput & {
  results: Record<string, SessionDiscovery>;
  pending: Record<string, Completion[]>;
};

export const discoveryKey = (input: SessionDiscoveryInput): string =>
  JSON.stringify([input.projectId, input.agent]);

export const discoveryCacheId = 'sessionDiscovery';

export const discoveryCacheMachine = setup({
  // SAFETY: XState uses these only as type declarations.
  types: {
    input: {} as OpenSessionsInput,
    context: {} as Context,
    events: {} as
      | Refresh
      | DoneActorEvent<DiscoveryResult, string>
      | { type: 'discovery.stop' },
  },
  actors: { discovery: discoveryMachine },
  actions: {
    refresh: assign(({ context, event, spawn }) => {
      if (event.type !== 'discovery.refresh') return {};
      const key = discoveryKey(event);
      const existing = context.pending[key];

      if (!existing)
        spawn('discovery', {
          id: key,
          input: {
            ...context,
            projectId: event.projectId,
            agent: event.agent,
            key,
          },
        });

      return {
        pending: {
          ...context.pending,
          [key]: [
            ...(existing ?? []),
            ...(event.completion ? [event.completion] : []),
          ],
        },
      };
    }),
    complete: enqueueActions(({ context, event, enqueue }) => {
      if (!('output' in event)) return;
      const { key, result, error } = event.output;

      for (const completion of context.pending[key] ?? []) {
        if (result) completion.resolve(result);
        else completion.reject(error);
      }

      enqueue.stopChild(key);
      enqueue.assign({
        results: result
          ? { ...context.results, [key]: result }
          : context.results,
        pending: Object.fromEntries(
          Object.entries(context.pending).filter(
            ([cachedKey]) => cachedKey !== key,
          ),
        ),
      });
    }),
    stop: enqueueActions(({ context, enqueue }) => {
      for (const [key, completions] of Object.entries(context.pending)) {
        for (const completion of completions)
          completion.reject(new Error('Engine stopped during discovery'));
        enqueue.stopChild(key);
      }
    }),
  },
}).createMachine({
  id: 'discoveryCache',
  context: ({ input }) => ({ ...input, results: {}, pending: {} }),
  initial: 'running',
  states: {
    running: {
      on: {
        'discovery.refresh': { actions: 'refresh' },
        'xstate.done.actor.*': { actions: 'complete' },
        'discovery.stop': { target: 'stopped', actions: 'stop' },
      },
    },
    stopped: { type: 'final' },
  },
});

export type DiscoveryCacheActor = ActorRefFrom<typeof discoveryCacheMachine>;
