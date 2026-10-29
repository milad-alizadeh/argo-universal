import type {
  AgentOptionsUpdate,
  SessionAgentOptionsInput,
} from '@repo/contracts';
import type { Subscription } from 'xstate';
import type { OpenSessions } from '../open-sessions';
import type { SessionContext } from '../session-context';
import type { SessionActorRef } from '../session-machine';
import { withHeldConfiguration } from './held-options';

type Input = SessionAgentOptionsInput & { sessionId: string };

type Observation = {
  deps: OpenSessions;
  input: Input;
  observer: {
    update: (update: AgentOptionsUpdate) => void;
    done: () => void;
  };
};

const optionsUpdate = (
  input: Input,
  context: SessionContext,
): AgentOptionsUpdate => ({
  agent: input.agent,
  projectId: input.projectId,
  configOptions: withHeldConfiguration(
    context.configOptions,
    context.heldConfig,
  ),
  commands: context.slashCommands,
  stage: 'ready',
});

function publication({ deps, input, observer }: Observation): () => void {
  return () => {
    const session = deps.session(input.sessionId);

    if (!session) return;

    observer.update(optionsUpdate(input, session.getSnapshot().context));
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
  const next = observation.deps.session(observation.input.sessionId);

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

  const sessionsSubscription = observation.deps.subscribe({
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
