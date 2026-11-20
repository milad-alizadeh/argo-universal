import type { Shell, ShellOutput } from '@repo/contracts';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { skipToken, useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useCallback, useRef, useState } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import {
  appendShellOutput,
  createShellOutputStore,
  type ShellOutputBuffer,
  type ShellOutputStore,
} from '../api/shell-output-buffer';
import type { ShellPanelProps } from '../components/shell-list/shell-panel';

// The subscription lives with the Session page, but its chunks go to the store, which only the open output view reads.
function useShellOutput(sessionId: string, shellId: string): ShellOutputStore {
  const [store] = useState(createShellOutputStore);
  const events = useReceivedOutput(shellId, store);

  const stream = useSubscription(
    useTRPC().shell.output.subscriptionOptions(
      shellId ? { sessionId, shellId } : skipToken,
      events,
    ),
  );

  useResubscribeOnReconnect(stream);
  useShellFailure("Couldn't read Background Task output", stream.error);

  return store;
}

type OutputEvents = {
  onStarted: () => void;
  onData: (chunk: ShellOutput) => void;
};

function useReceivedOutput(
  shellId: string,
  store: ShellOutputStore,
): OutputEvents {
  const received = useRef<ShellOutputBuffer | null>(null);

  return {
    onStarted: () => {
      received.current = null;
    },
    onData: (chunk: ShellOutput) => {
      received.current = appendShellOutput(received.current, shellId, chunk);
      store.receive(received.current);
    },
  };
}

type ShellSelection = { id: string; inWorkbench: boolean };

const noSelection: ShellSelection = { id: '', inWorkbench: false };

type ShellSelectionProps = Pick<
  ShellPanelProps,
  'openId' | 'onSelect' | 'onSelectFromWorkbench' | 'onDeselect'
>;

function useShellSelection(): [ShellSelection, ShellSelectionProps] {
  const [selection, select] = useState(noSelection);

  return [
    selection,
    {
      openId: selection.id || undefined,
      onSelect: (shell) => select({ id: shell.id, inWorkbench: false }),
      onSelectFromWorkbench: (shell) =>
        select({ id: shell.id, inWorkbench: true }),
      onDeselect: useCallback(() => select(noSelection), []),
    },
  ];
}

const workbenchStream = (
  { id, inWorkbench }: ShellSelection,
  focused: boolean,
): string => (focused && inWorkbench ? id : '');

export function useSessionShells(
  sessionId: string,
  shells: Shell[],
  active: boolean,
): ShellPanelProps {
  const focused = useScreenFocused();
  const [selected, selection] = useShellSelection();
  const streamId = active ? selected.id : workbenchStream(selected, focused);

  return {
    shells,
    ...selection,
    outputSource: useShellOutput(sessionId, streamId),
    onStop: useStopShell(sessionId),
  };
}

function useStopShell(sessionId: string): ShellPanelProps['onStop'] {
  const trpc = useTRPC();
  const stop = useMutation(trpc.shell.stop.mutationOptions());
  useShellFailure("Couldn't stop Background Task", stop.error);

  return (shell) => stop.mutate({ sessionId, shellId: shell.id });
}

function useShellFailure(
  title: string,
  error: { message: string } | null,
): void {
  useErrorToast(error ? { title, message: error.message } : undefined);
}
