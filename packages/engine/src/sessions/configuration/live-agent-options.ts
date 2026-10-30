import type {
  AgentOptionsUpdate,
  SessionAgentOptionsInput,
  SlashCommand,
} from '@repo/contracts';
import type { Subscription } from 'xstate';
import type { OpenSessions } from '../open-sessions';
import type { SessionContext } from '../session-context';
import type { SessionActorRef } from '../session-machine';
import { withHeldConfiguration } from './held-options';

type Input = SessionAgentOptionsInput & { sessionId: string };

type Observation = {
  sessions: Pick<OpenSessions, 'session' | 'subscribe'>;
  input: Input;
  // The Agent and Project list, which stands in until this Session's Agent reports its own.
  savedCommands: () => SlashCommand[] | null;
  observer: {
    update: (update: AgentOptionsUpdate) => void;
    done: () => void;
  };
};

const optionsUpdate = (
  { input, savedCommands }: Observation,
  context: SessionContext,
): AgentOptionsUpdate => ({
  agent: input.agent,
  projectId: input.projectId,
  configOptions: withHeldConfiguration(
    context.configOptions,
    context.heldConfig,
  ),
  commands: context.slashCommands ?? savedCommands(),
  stage: 'ready',
});

function publication(observation: Observation): () => void {
  return () => {
    const session = observation.sessions.session(observation.input.sessionId);

    if (!session) return;

    observation.observer.update(
      optionsUpdate(observation, session.getSnapshot().context),
    );
  };
}

type FollowState = {
  current?: SessionActorRef;
  subscription?: Subscription;
};

function replaceSession(
  state: FollowState,
  next: SessionActorRef | undefined,
  publish: () => void,
): void {
  state.subscription?.unsubscribe();
  state.current = next;
  state.subscription = next?.subscribe({ next: publish });
}

function followCurrent(
  state: FollowState,
  observation: Observation,
  publish: () => void,
): void {
  const next = observation.sessions.session(observation.input.sessionId);

  if (next === state.current) return;
  replaceSession(state, next, publish);
  publish();
}

const stopFollowing = (state: FollowState, sessions: Subscription): void => {
  state.subscription?.unsubscribe();
  sessions.unsubscribe();
};

function followSession(
  observation: Observation,
  publish: () => void,
): () => void {
  const state: FollowState = {};
  const follow = (): void => followCurrent(state, observation, publish);

  const sessionsSubscription = observation.sessions.subscribe({
    next: follow,
    complete: observation.observer.done,
  });

  follow();

  return () => stopFollowing(state, sessionsSubscription);
}

// A Session reader follows replacement actors while the person closes and resumes it.
export function observeLiveAgentOptions(observation: Observation): () => void {
  return followSession(observation, publication(observation));
}
