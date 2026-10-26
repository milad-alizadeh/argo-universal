import type { Shell, ShellOutput } from '@repo/contracts';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { skipToken, useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { type Dispatch, type SetStateAction, useState } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import type { ShellPanelProps } from '../components/shell-list/shell-panel';

type OutputText = NonNullable<ShellPanelProps['output']>;

function useShellOutput(
  sessionId: string,
  shellId: string,
): OutputText | undefined {
  const [output, setOutput] = useState<OutputText>();

  const stream = useSubscription(
    useTRPC().shell.output.subscriptionOptions(
      shellId ? { sessionId, shellId } : skipToken,
      outputEvents(shellId, setOutput),
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

function outputEvents(
  shellId: string,
  setOutput: Dispatch<SetStateAction<OutputText | undefined>>,
): OutputEvents {
  return {
    onStarted: () => setOutput(undefined),
    onData: (chunk: ShellOutput) =>
      setOutput((previous) => appendOutput(previous, shellId, chunk)),
  };
}

function appendOutput(
  previous: OutputText | undefined,
  shellId: string,
  chunk: ShellOutput,
): OutputText {
  const text = previous?.shellId === shellId ? previous.text : '';

  return { shellId, text: text + chunk.text };
}

export function useSessionShells(
  sessionId: string,
  shells: Shell[],
): ShellPanelProps {
  const [shellId, setShellId] = useState('');
  const output = useShellOutput(sessionId, shellId);
  const stop = useStopShell(sessionId);

  return {
    shells,
    output,
    onSelect: (shell) => setShellId(shell.id),
    onStop: stop,
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
