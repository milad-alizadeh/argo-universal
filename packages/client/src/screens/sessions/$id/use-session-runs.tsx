import type { RunConfigurationRow, RunStatusResult } from '@repo/contracts';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { skipToken, useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useCallback, useState, type ReactElement } from 'react';
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
import { LatestTerminalSize } from './latest-terminal-size';

function useRunStatus(sessionId: string, active: boolean): RunStatusResult {
  const trpc = useTRPC();

  const [snapshot, setSnapshot] = useState<{
    sessionId: string;
    status: RunStatusResult;
  }>();

  const stream = useSubscription(
    trpc.run.watchStatus.subscriptionOptions(
      active ? { sessionId } : skipToken,
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
    ? snapshot.status
    : { configurations: [] };
}

export function useSessionRuns(
  sessionId: string,
  active: boolean,
): SessionRuns {
  const trpc = useTRPC();
  const status = useRunStatus(sessionId, active);
  const start = useMutation(trpc.run.start.mutationOptions());
  const stop = useMutation(trpc.run.stop.mutationOptions());
  const restart = useMutation(trpc.run.restart.mutationOptions());
  const shells = useShellControls(sessionId, active, status.shells);

  const message =
    start.error?.message ??
    stop.error?.message ??
    restart.error?.message ??
    shells.failure ??
    status.configurationError;

  useErrorToast(message ? { title: 'Runs', message } : undefined);
  const defaultGroup = useRunGroupControls(sessionId, status.defaultGroup);

  return {
    runs: status.configurations,
    defaultGroup,
    ...shells.controls,
    onStart: (name) => start.mutate({ sessionId, name }),
    onStop: (name) => stop.mutate({ sessionId, name }),
    onRestart: (name) => restart.mutate({ sessionId, name }),
    renderTerminal: (run, visible, compact) => (
      <ConnectedRunTerminal
        key={sessionId}
        {...{ sessionId, run }}
        active={active && visible}
        compact={compact}
      />
    ),
  };
}

type ShellControls = {
  controls: Pick<
    SessionRuns,
    'shells' | 'openShell' | 'closeShell' | 'renderShell'
  >;
  failure: string | undefined;
};

function useShellControls(
  sessionId: string,
  active: boolean,
  shells: SessionRuns['shells'],
): ShellControls {
  const trpc = useTRPC();
  const open = useMutation(trpc.terminal.open.mutationOptions());
  const close = useMutation(trpc.terminal.close.mutationOptions());

  return {
    failure: open.error?.message ?? close.error?.message,
    controls: {
      shells,
      openShell: active
        ? (opened) => open.mutate({ sessionId }, { onSuccess: opened })
        : undefined,
      closeShell: (shellId) => close.mutate({ sessionId, shellId }),
      renderShell: (shell, visible, compact) => (
        <ConnectedRunTerminal
          key={shell.id}
          sessionId={sessionId}
          shellId={shell.id}
          run={{ name: shell.name, status: 'ready' }}
          active={active && visible}
          compact={compact}
        />
      ),
    },
  };
}

function useRunGroupControls(
  sessionId: string,
  status: RunStatusResult['defaultGroup'],
): SessionRuns['defaultGroup'] {
  const trpc = useTRPC();
  const start = useMutation(trpc.run.startGroup.mutationOptions());
  const stop = useMutation(trpc.run.stopGroup.mutationOptions());
  const failedMember = start.data?.members.find((member) => 'error' in member);

  const message =
    start.error?.message ?? stop.error?.message ?? failedMember?.error;

  useErrorToast(message ? { title: 'Runs', message } : undefined);

  if (!status) return undefined;

  return {
    status,
    onStart: () => start.mutate({ sessionId, name: status.name }),
    onStop: () => stop.mutate({ sessionId, name: status.name }),
  };
}

type TerminalRun = Pick<RunConfigurationRow, 'name' | 'status'>;

type TerminalRef = { name: string } | { shellId: string };

const terminalRef = (name: string, shellId?: string): TerminalRef =>
  shellId ? { shellId } : { name };

function ConnectedRunTerminal({
  sessionId,
  run,
  shellId,
  active,
  compact,
}: {
  sessionId: string;
  run: TerminalRun;
  shellId?: string;
  active: boolean;
  compact?: boolean;
}): ReactElement {
  const client = useTRPCClient();
  const connected = useConnectionState() === 'open' && active;
  const { name } = run;
  const [failure, setFailure] = useState<string>();

  const listen = useCallback<RunOutputSource>(
    (cursor, receive) => {
      const subscription = client.run.output.subscribe(
        { sessionId, ...terminalRef(name, shellId), cursor },
        {
          onData: receive,
          onError: (error) => setFailure(error.message),
        },
      );

      return (): void => subscription.unsubscribe();
    },
    [client, sessionId, name, shellId],
  );

  const onInput = useCallback(
    async (input: string): Promise<void> => {
      await client.terminal.send
        .mutate({ sessionId, ...terminalRef(name, shellId), input })
        .catch((error: Error) => setFailure(error.message));
    },
    [client, sessionId, name, shellId],
  );

  const onResize = useRunResize({
    sessionId,
    run,
    shellId,
    connected,
    setFailure,
  });

  useErrorToast(failure ? { title: 'Terminal', message: failure } : undefined);

  return (
    <RunTerminal {...{ run, connected, listen, onInput, onResize, compact }} />
  );
}

type Resize = {
  sessionId: string;
  run: TerminalRun;
  shellId?: string;
  connected: boolean;
  setFailure: (message: string) => void;
};

function useRunResize({
  sessionId,
  run,
  shellId,
  connected,
  setFailure,
}: Resize): (columns: number, rows: number) => void {
  const client = useTRPCClient();
  const [pending] = useState(() => new LatestTerminalSize());
  const { name, status } = run;
  const enabled = connected && (status === 'ready' || status === 'starting');

  return useCallback(
    (columns, rows) => {
      if (!enabled) return;

      pending.request({ columns, rows }, async (size) => {
        await client.terminal.resize
          .mutate({ sessionId, ...terminalRef(name, shellId), ...size })
          .catch((error: Error) => setFailure(error.message));
      });
    },
    [client, enabled, name, shellId, pending, sessionId, setFailure],
  );
}
