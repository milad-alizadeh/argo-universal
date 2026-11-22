import type { RunStatusResult } from '@repo/contracts';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { skipToken, useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import {
  useConnectionState,
  useResubscribeOnReconnect,
  useTRPC,
  useTRPCClient,
} from '#features/connection';
import {
  RunTerminal,
  runIsActive,
  type RunOutputSource,
  type SessionRuns,
} from '#features/sessions';
import { LatestTerminalSize } from './latest-terminal-size';
import {
  runTabKey,
  shellTabKey,
  type TerminalKey,
  type TerminalTarget,
  terminalTarget,
} from './session-terminal-tabs';

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
      <ConnectedTerminal
        key={sessionId}
        {...{ sessionId, compact }}
        tabKey={runTabKey(run.name)}
        name={run.name}
        interactive={runIsActive(run)}
        active={active && visible}
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
        <ConnectedTerminal
          key={shell.id}
          sessionId={sessionId}
          tabKey={shellTabKey(shell.id)}
          name={shell.name}
          interactive
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

type ConnectedTerminalProps = {
  sessionId: string;
  tabKey: TerminalKey;
  name: string;
  interactive: boolean;
  active: boolean;
  compact?: boolean;
};

function ConnectedTerminal({
  sessionId,
  tabKey,
  name,
  interactive,
  active,
  compact,
}: ConnectedTerminalProps): ReactElement {
  const client = useTRPCClient();
  const connected = useConnectionState() === 'open' && active;
  const target = useMemo(() => terminalTarget(tabKey), [tabKey]);
  const [failure, setFailure] = useState<string>();

  const listen = useCallback<RunOutputSource>(
    (cursor, receive) => {
      const subscription = client.run.output.subscribe(
        { sessionId, ...target, cursor },
        {
          onData: receive,
          onError: (error) => setFailure(error.message),
        },
      );

      return (): void => subscription.unsubscribe();
    },
    [client, sessionId, target],
  );

  const onInput = useCallback(
    async (input: string): Promise<void> => {
      await client.terminal.send
        .mutate({ sessionId, ...target, input })
        .catch((error: Error) => setFailure(error.message));
    },
    [client, sessionId, target],
  );

  const onResize = useTerminalResize({
    sessionId,
    target,
    enabled: connected && interactive,
    setFailure,
  });

  useErrorToast(failure ? { title: 'Terminal', message: failure } : undefined);

  return (
    <RunTerminal
      {...{ name, interactive, connected, listen, onInput, onResize, compact }}
    />
  );
}

type Resize = {
  sessionId: string;
  target: TerminalTarget;
  enabled: boolean;
  setFailure: (message: string) => void;
};

function useTerminalResize({
  sessionId,
  target,
  enabled,
  setFailure,
}: Resize): (columns: number, rows: number) => void {
  const client = useTRPCClient();
  const [pending] = useState(() => new LatestTerminalSize());

  return useCallback(
    (columns, rows) => {
      if (!enabled) return;

      pending.request({ columns, rows }, async (size) => {
        await client.terminal.resize
          .mutate({ sessionId, ...target, ...size })
          .catch((error: Error) => setFailure(error.message));
      });
    },
    [client, enabled, target, pending, sessionId, setFailure],
  );
}
