import type {
  AgentOptionsUpdate,
  SessionOpenError,
  SessionAgentOptionsInput,
} from '@repo/contracts';
import { skipToken, type SkipToken } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useMemo, useState } from 'react';
import {
  useTRPC,
  useResubscribeOnReconnect,
  type ClientError,
} from '#features/connection';
import { useErrorToast } from '#primitives/overlays/toast';
import { openErrorOf } from '../utils/open-failure';
import { optionsReadToast } from '../utils/options-read-toast';
import {
  type SessionOptions,
  type SessionOptionsChoice,
  sessionOptions,
} from '../utils/session-options';
import { useConnectionDropped } from './use-connection-dropped';

export interface OptionsDiscovery extends SessionOptions {
  stage?: AgentOptionsUpdate['stage'];
  progress?: number;
  error?: SessionOpenError;
  retry: () => void;
}

type Choice = Pick<SessionOptionsChoice, 'agent' | 'projectId' | 'picks'> & {
  sessionId?: string;
};

interface Received {
  owner: string;
  update: AgentOptionsUpdate;
}

interface DiscoveryRead {
  data: AgentOptionsUpdate | undefined;
  error: ClientError | null;
  reset: () => void;
}

const inputOf = ({
  agent,
  projectId,
  picks,
  sessionId,
}: Choice): SessionAgentOptionsInput | SkipToken =>
  agent && projectId ? { agent, projectId, picks, sessionId } : skipToken;

// Keep the displayed Server snapshot while a changed pick restarts the stream.
function retainSnapshot(
  previous: Received | undefined,
  next: Received,
): Received {
  if (!previous) return next;

  return retainOwnedSnapshot(previous, next);
}

function retainOwnedSnapshot(previous: Received, next: Received): Received {
  if (next.update.configOptions !== null) return next;

  if (previous.owner !== next.owner) return next;

  return {
    ...next,
    update: { ...next.update, configOptions: previous.update.configOptions },
  };
}

function useDiscovery(choice: Choice): DiscoveryRead {
  const owner = ownerOf(choice);

  const [received, setReceived] = useState<Received>();

  const stream = useSubscription({
    ...useTRPC().session.agentOptions.subscriptionOptions(inputOf(choice)),
    onData: (update) =>
      setReceived((previous) => retainSnapshot(previous, { owner, update })),
  });

  useResubscribeOnReconnect(stream);

  return {
    data: currentUpdate(received, owner),
    error: stream.error,
    reset: stream.reset,
  };
}

const ownerOf = (choice: Choice): string =>
  JSON.stringify([choice.agent, choice.projectId, choice.sessionId]);

const currentUpdate = (
  received: Received | undefined,
  owner: string,
): AgentOptionsUpdate | undefined =>
  received?.owner === owner ? received.update : undefined;

function useReadError(
  read: DiscoveryRead,
  sessionId: string | undefined,
): SessionOpenError | undefined {
  const dropped = useConnectionDropped(read.error);
  useErrorToast(sessionId ? optionsReadToast(read.error, dropped) : undefined);

  return dropped ? undefined : openErrorOf(read.error);
}

function useOptions(
  read: DiscoveryRead,
  picks: Choice['picks'],
): SessionOptions {
  const cached = read.data?.configOptions ?? undefined;
  const opening = isOpening(read);

  return useMemo(
    () => sessionOptions(cached, { saved: {}, picks, opening }),
    [cached, picks, opening],
  );
}

const isOpening = (read: DiscoveryRead): boolean =>
  read.data?.configOptions === null && !read.error;

// The Server owns both the saved snapshot and discovery; the screen keeps only picks.
export function useSessionOptions(choice: Choice): OptionsDiscovery {
  const read = useDiscovery(choice);
  const error = useReadError(read, choice.sessionId);
  const options = useOptions(read, choice.picks);

  return {
    ...options,
    stage: read.data?.stage,
    progress: read.data?.progress,
    error,
    retry: read.reset,
  };
}
