import { EventEmitter, on } from 'node:events';
import type {
  AgentOptionsUpdate,
  SessionAgentOptionsInput,
} from '@repo/contracts';
import type { Subscription } from 'xstate';
import { withHeldConfiguration } from './configuration/held-configuration';
import type { SessionRouterDeps } from './router-deps';
import type { SessionActorRef } from './session-machine';

type Deps = Pick<SessionRouterDeps, 'sessions'>;

type Input = SessionAgentOptionsInput & { sessionId: string };

type Events = EventEmitter<{ update: [AgentOptionsUpdate]; done: [] }>;

type Observation = {
  deps: Deps;
  input: Input;
  observer: {
    update: (update: AgentOptionsUpdate) => void;
    done: () => void;
  };
};

function publication({ deps, input, observer }: Observation): () => void {
  let previous = '';

  return () => {
    const session =
      deps.sessions.getSnapshot().context.sessions[input.sessionId];

    if (!session) return;

    const context = session.getSnapshot().context;

    const update: AgentOptionsUpdate = {
      agent: input.agent,
      projectId: input.projectId,
      configOptions: withHeldConfiguration(
        context.configOptions,
        context.heldConfig,
      ),
      commands: context.slashCommands,
      stage: 'ready',
    };

    const key = JSON.stringify(update);

    if (key === previous) return;

    previous = key;
    observer.update(update);
  };
}

function followSession(
  { deps, input, observer }: Observation,
  publish: () => void,
): () => void {
  let current: SessionActorRef | undefined;
  let subscription: Subscription | undefined;

  const follow = (): void => {
    const next = deps.sessions.getSnapshot().context.sessions[input.sessionId];

    if (next === current) return;

    subscription?.unsubscribe();
    current = next;
    subscription = current?.subscribe({ next: publish });
    publish();
  };

  const sessionsSubscription = deps.sessions.subscribe({
    next: follow,
    complete: observer.done,
  });

  follow();

  return () => {
    subscription?.unsubscribe();
    sessionsSubscription.unsubscribe();
  };
}

// A Session reader follows replacement actors while the person closes and resumes it.
export function observeLiveAgentOptions(observation: Observation): () => void {
  return followSession(observation, publication(observation));
}

// An open Session already has its actual configuration; observe it without opening discovery.
export async function* liveAgentOptions(
  deps: Deps,
  input: Input,
  signal?: AbortSignal,
): AsyncGenerator<AgentOptionsUpdate> {
  const events: Events = new EventEmitter();
  const stream = on(events, 'update', { signal, close: ['done'] });

  const unsubscribe = observeLiveAgentOptions({
    deps,
    input,
    observer: {
      update: (update) => {
        events.emit('update', update);
      },
      done: () => {
        events.emit('done');
      },
    },
  });

  try {
    for await (const [update] of stream) yield update;
  } finally {
    unsubscribe();
    await stream.return?.();
  }
}
