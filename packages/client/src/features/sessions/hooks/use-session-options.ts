import type { AgentOptionsUpdate, SessionOpenError } from '@repo/contracts';
import { skipToken } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useMemo, useState } from 'react';
import { useTRPC, useResubscribeOnReconnect } from '#features/connection';
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

// The Server owns both the saved snapshot and discovery; the screen keeps only picks.
export function useSessionOptions(
  choice: Pick<SessionOptionsChoice, 'agent' | 'projectId' | 'picks'> & {
    sessionId?: string;
  },
): OptionsDiscovery {
  const { agent, projectId, picks, sessionId } = choice;
  const owner = JSON.stringify([agent, projectId, sessionId]);
  // Keep the displayed Server snapshot while a changed pick restarts the stream.
  const [received, setReceived] = useState<{
    owner: string;
    update: AgentOptionsUpdate;
  }>();
  const stream = useSubscription({
    ...useTRPC().session.agentOptions.subscriptionOptions(
      agent && projectId ? { agent, projectId, picks, sessionId } : skipToken,
    ),
    onData: (update) =>
      setReceived((previous) =>
        update.configOptions === null && previous?.owner === owner
          ? {
              owner,
              update: {
                ...update,
                configOptions: previous.update.configOptions,
              },
            }
          : { owner, update },
      ),
  });
  useResubscribeOnReconnect(stream);
  const dropped = useConnectionDropped(stream.error);
  useErrorToast(
    sessionId ? optionsReadToast(stream.error, dropped) : undefined,
  );
  // Ignore a previous owner's last delivery while the subscription changes.
  const data = received?.owner === owner ? received.update : undefined;
  const cached = data?.configOptions ?? undefined;
  const opening = data?.configOptions === null && !stream.error;
  const options = useMemo(
    () => sessionOptions(cached, { saved: {}, picks, opening }),
    [cached, picks, opening],
  );
  return {
    ...options,
    stage: data?.stage,
    progress: data?.progress,
    error: dropped ? undefined : openErrorOf(stream.error),
    retry: stream.reset,
  };
}
