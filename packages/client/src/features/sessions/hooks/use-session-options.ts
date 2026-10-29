import type {
  AgentOptionsUpdate,
  SessionAgentOptionsInput,
  SessionOpenError,
} from '@repo/contracts';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { skipToken, type SkipToken } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  useTRPC,
  useResubscribeOnReconnect,
  type ClientError,
} from '#features/connection';
import { openErrorOf } from '../utils/open-failure';
import { optionsReadToast } from '../utils/options-read-toast';
import {
  SessionOptionsState,
  type OptionsChoice,
  type OptionsSnapshot,
} from '../utils/session-options-state';
import { useConnectionDropped } from './use-connection-dropped';

type OptionsDiscovery = OptionsSnapshot & { retry: () => void };

export interface SessionOptionsRead extends OptionsDiscovery {
  pick: (configId: string, value: string | boolean) => void;
}

type ReadFailure = { error: SessionOpenError | undefined; dropped: boolean };

type DiscoveryRead = { error: ClientError | null; reset: () => void };

type Change = Dispatch<SetStateAction<SessionOptionsState>>;

function inputOf(
  choice: OptionsChoice,
  state: SessionOptionsState,
): SessionAgentOptionsInput | SkipToken {
  const { agent, projectId, sessionId } = choice;

  return agent && projectId
    ? { agent, projectId, sessionId, picks: state.picks }
    : skipToken;
}

function useOptionsState(choice: OptionsChoice): [SessionOptionsState, Change] {
  const [previous, change] = useState(() => new SessionOptionsState(choice));
  const current = previous.forChoice(choice);

  if (current !== previous) change(current);

  return [current, change];
}

function useDiscovery(
  choice: OptionsChoice,
  state: SessionOptionsState,
  change: Change,
): DiscoveryRead {
  const stream = useSubscription({
    ...useTRPC().session.agentOptions.subscriptionOptions(
      inputOf(choice, state),
    ),
    onData: (update: AgentOptionsUpdate): void =>
      change((previous) => previous.receive(state.owner, update)),
  });

  useResubscribeOnReconnect(stream);

  return stream;
}

function useReadFailure(
  error: ClientError | null,
  sessionId: string | undefined,
): ReadFailure {
  const dropped = useConnectionDropped(error);
  useErrorToast(sessionId ? optionsReadToast(error, dropped) : undefined);

  return { error: openErrorOf(error), dropped };
}

// tRPC and Connection effects adapt the state module to React; Server persistence stays on the Server.
export function useSessionOptions(choice: OptionsChoice): SessionOptionsRead {
  const [state, change] = useOptionsState(choice);
  const read = useDiscovery(choice, state, change);
  const failure = useReadFailure(read.error, choice.sessionId);
  const options = useProjection(state, choice, failure.error);

  return {
    ...options,
    error: failure.dropped ? undefined : options.error,
    retry: read.reset,
    pick: (configId: string, value: string | boolean): void =>
      change((previous) => previous.pick(configId, value)),
  };
}

function useProjection(
  state: SessionOptionsState,
  choice: OptionsChoice,
  error: SessionOpenError | undefined,
): OptionsSnapshot {
  const { liveConfigOptions } = choice;

  return useMemo(
    () => state.snapshot({ liveConfigOptions, error }),
    [state, liveConfigOptions, error],
  );
}
