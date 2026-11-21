import type { RunConfigurationRow, RunStatusResult } from '@repo/contracts';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { skipToken, useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useCallback, useState, type ReactElement } from 'react';
import { Platform } from 'react-native';
import {
  useConnectionState,
  useResubscribeOnReconnect,
  useTRPC,
  useTRPCClient,
} from '#features/connection';
import {
  RunTerminal,
  type RunOutputSource,
  type SessionRuns,
} from '#features/sessions';

function useRunStatus(
  sessionId: string,
  active: boolean,
): RunConfigurationRow[] {
  const trpc = useTRPC();
  const [snapshot, setSnapshot] = useState<{
    sessionId: string;
    status: RunStatusResult;
  }>();

  const enabled = active && Platform.OS === 'web';

  const stream = useSubscription(
    trpc.run.watchStatus.subscriptionOptions(
      enabled ? { sessionId } : skipToken,
      {
        onData: (status) => setSnapshot({ sessionId, status }),
      },
    ),
  );

  useResubscribeOnReconnect(stream);
  useErrorToast(
    stream.error ? { title: 'Runs', message: stream.error.message } : undefined,
  );

  return snapshot?.sessionId === sessionId
    ? snapshot.status.configurations
    : [];
}

export function useSessionRuns(
  sessionId: string,
  active: boolean,
): SessionRuns {
  const trpc = useTRPC();
  const runs = useRunStatus(sessionId, active);
  const start = useMutation(trpc.run.start.mutationOptions());
  const stop = useMutation(trpc.run.stop.mutationOptions());
  const restart = useMutation(trpc.run.restart.mutationOptions());
  const error = start.error ?? stop.error ?? restart.error;

  useErrorToast(error ? { title: 'Runs', message: error.message } : undefined);

  return {
    runs,
    onStart: (name) => start.mutate({ sessionId, name }),
    onStop: (name) => stop.mutate({ sessionId, name }),
    onRestart: (name) => restart.mutate({ sessionId, name }),
    renderTerminal: (run, visible) => (
      <ConnectedRunTerminal
        key={sessionId}
        {...{ sessionId, run }}
        active={active && visible}
      />
    ),
  };
}

function ConnectedRunTerminal({
  sessionId,
  run,
  active,
}: {
  sessionId: string;
  run: RunConfigurationRow;
  active: boolean;
}): ReactElement {
  const client = useTRPCClient();
  const connected = useConnectionState() === 'open' && active;
  const { name } = run;
  const [failure, setFailure] = useState<string>();
  const listen = useCallback<RunOutputSource>(
    (cursor, receive) => {
      const subscription = client.run.output.subscribe(
        { sessionId, name, cursor },
        {
          onData: receive,
          onError: (error) => setFailure(error.message),
        },
      );

      return (): void => subscription.unsubscribe();
    },
    [client, sessionId, name],
  );

  const onInput = useCallback(
    async (input: string): Promise<void> => {
      await client.terminal.send
        .mutate({ sessionId, name, input })
        .catch((error: Error) => setFailure(error.message));
    },
    [client, sessionId, name],
  );

  const canResize =
    connected && (run.status === 'ready' || run.status === 'starting');

  const onResize = useCallback(
    (columns: number, rows: number): void => {
      if (!canResize) return;

      void client.terminal.resize
        .mutate({ sessionId, name, columns, rows })
        .catch((error: Error) => setFailure(error.message));
    },
    [canResize, client, name, sessionId],
  );

  useErrorToast(failure ? { title: 'Terminal', message: failure } : undefined);

  return <RunTerminal {...{ run, connected, listen, onInput, onResize }} />;
}
