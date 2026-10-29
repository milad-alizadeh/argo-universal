import type {
  AgentOptionsUpdate,
  SessionAgentOptionsInput,
  SlashCommand,
} from '@repo/contracts';
import type { Subscription } from 'xstate';
import { withHeldConfiguration } from './configuration/held-configuration';
import type { SessionRouterDeps } from './router-deps';
import type { SessionActorRef } from './session-machine';

type Deps = Pick<SessionRouterDeps, 'sessions'>;

type Input = SessionAgentOptionsInput & { sessionId: string };

type Observation = {
  deps: Deps;
  input: Input;
  // The Agent and Project list, which stands in until this Session's Agent reports its own.
  savedCommands: () => SlashCommand[] | null;
  observer: {
    update: (update: AgentOptionsUpdate) => void;
    done: () => void;
  };
};

function publication({
  deps,
  input,
  savedCommands,
  observer,
}: Observation): () => void {
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
      commands: context.slashCommands ?? savedCommands(),
      stage: 'ready',
    };

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
