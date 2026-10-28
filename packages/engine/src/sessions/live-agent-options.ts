import { EventEmitter, on } from 'node:events';
import type {
  AgentOptionsUpdate,
  SessionAgentOptionsInput,
} from '@repo/contracts';
import {
  readAgentConfiguration,
  AgentOptionsJob,
} from './agent-options-storage';
import { withHeldConfiguration } from './configuration/held-configuration';
import type { SessionRouterDeps } from './router-deps';
import type { SessionActorRef } from './session-machine';

type Deps = Pick<SessionRouterDeps, 'database' | 'findWriter' | 'sessions'>;

type Input = SessionAgentOptionsInput & { sessionId: string };

type Events = EventEmitter<{ update: [AgentOptionsUpdate]; done: [] }>;

type Observation = {
  deps: Deps;
  input: Input;
  session: SessionActorRef;
  events: Events;
};

function publication({
  deps,
  input,
  session,
  events,
}: Observation): () => void {
  let previous = '';

  return () => {
    const context = session.getSnapshot().context;

    const saved = readAgentConfiguration(
      { database: deps.database, writer: deps.findWriter() },
      input,
    );

    const update: AgentOptionsUpdate = {
      agent: input.agent,
      projectId: input.projectId,
      configOptions: withHeldConfiguration(
        context.configOptions,
        context.heldConfig,
      ),
      commands: saved?.commands ?? null,
      stage: 'ready',
    };

    const key = JSON.stringify(update);

    if (key === previous) return;

    previous = key;
    events.emit('update', update);
  };
}

function observe(deps: Deps, input: Input, events: Events): () => void {
  const session = deps.sessions.getSnapshot().context.sessions[input.sessionId];

  if (!session) {
    events.emit('done');

    return () => {};
  }

  const publish = publication({ deps, input, session, events });

  const sessionSubscription = session.subscribe({
    next: publish,
    complete: () => events.emit('done'),
  });

  const writerSubscription = deps
    .findWriter()
    ?.on('writer.queued', ({ jobs }) => {
      if (jobs.some((job) => job instanceof AgentOptionsJob && job.owns(input)))
        publish();
    });

  publish();

  return () => {
    sessionSubscription.unsubscribe();
    writerSubscription?.unsubscribe();
  };
}

// An open Session already has its actual configuration; observe it without opening discovery.
export async function* liveAgentOptions(
  deps: Deps,
  input: Input,
  signal?: AbortSignal,
): AsyncGenerator<AgentOptionsUpdate> {
  const events: Events = new EventEmitter();
  const stream = on(events, 'update', { signal, close: ['done'] });
  const unsubscribe = observe(deps, input, events);

  try {
    for await (const [update] of stream) yield update;
  } finally {
    unsubscribe();
    await stream.return?.();
  }
}
