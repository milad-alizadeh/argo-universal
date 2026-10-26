import type { Shell, ShellOutput } from '@repo/contracts';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { skipToken, useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import {
  appendShellOutput,
  newestShellOutput,
  type ShellOutputBuffer,
} from '../api/shell-output-buffer';
import type { ShellPanelProps } from '../components/shell-list/shell-panel';

type OutputText = NonNullable<ShellPanelProps['output']>;

function useShellOutput(
  sessionId: string,
  shellId: string,
): OutputText | undefined {
  const { output, events } = useShellBuffer(shellId);

  const stream = useSubscription(
    useTRPC().shell.output.subscriptionOptions(
      shellId ? { sessionId, shellId } : skipToken,
      events,
    ),
  );

  useResubscribeOnReconnect(stream);
  useShellFailure("Couldn't read Shell output", stream.error);

  return output;
}

type OutputEvents = {
  onStarted: () => void;
  onData: (chunk: ShellOutput) => void;
};

interface ShellBuffer {
  output: ShellOutputBuffer | undefined;
  events: OutputEvents;
}

function useShellBuffer(shellId: string): ShellBuffer {
  const [output, setOutput] = useState<ShellOutputBuffer>();

  return { output, events: useReceivedOutput(shellId, setOutput) };
}

interface OutputBufferState {
  shellId: string;
  setOutput: Dispatch<SetStateAction<ShellOutputBuffer | undefined>>;
  received: RefObject<ShellOutputBuffer | null>;
}

function useReceivedOutput(
  shellId: string,
  setOutput: OutputBufferState['setOutput'],
): OutputEvents {
  const received = useRef<ShellOutputBuffer | null>(null);

  return {
    onStarted: () => {
      received.current = null;
    },
    onData: (chunk: ShellOutput) =>
      receiveOutput({ shellId, setOutput, received }, chunk),
  };
}

function receiveOutput(state: OutputBufferState, chunk: ShellOutput): void {
  const next = appendShellOutput(state.received.current, state.shellId, chunk);
  state.received.current = next;
  state.setOutput((previous) => newestShellOutput(previous, next));
}

export function useSessionShells(
  sessionId: string,
  shells: Shell[],
  active: boolean,
): ShellPanelProps {
  const [shellId, setShellId] = useState('');
  const output = useShellOutput(sessionId, active ? shellId : '');

  return {
    shells,
    output,
    onSelect: (shell) => setShellId(shell.id),
    onStop: useStopShell(sessionId),
    onDeselect: useCallback(() => setShellId(''), []),
  };
}

function useStopShell(sessionId: string): ShellPanelProps['onStop'] {
  const trpc = useTRPC();
  const stop = useMutation(trpc.session.stopShell.mutationOptions());
  useShellFailure("Couldn't stop Shell", stop.error);

  return (shell) => stop.mutate({ sessionId, shellId: shell.id });
}

function useShellFailure(
  title: string,
  error: { message: string } | null,
): void {
  useErrorToast(error ? { title, message: error.message } : undefined);
}
