import type { QueueCommand } from '@repo/contracts';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { ComposerProps } from '#features/composer';
import { type ServerMutation, type TRPC, useTRPC } from '#features/connection';
import type { OpenSession } from './session-composer-props';

type QueueMutation = ServerMutation<TRPC['session']['queue']>;

type QueueTarget = { sessionId: string; resumeAfterCommand: () => void };

export type QueueCommandSender = (command: QueueCommand) => Promise<void>;

export function useQueueCommand(target: QueueTarget): QueueCommandSender {
  const trpc = useTRPC();

  const mutation = useMutation(
    trpc.session.queue.mutationOptions({
      onSuccess: target.resumeAfterCommand,
    }),
  );

  useErrorToast(mutation.error ? queueError(mutation.error) : undefined);

  return useQueueSender(target.sessionId, mutation.mutateAsync);
}

function useQueueSender(
  sessionId: string,
  send: QueueMutation['mutateAsync'],
): QueueCommandSender {
  return useCallback(
    async (command: QueueCommand) => {
      await send({ sessionId, command });
    },
    [send, sessionId],
  );
}

function queueError(error: { message: string }): ErrorToast {
  return { title: 'Queue change failed', message: error.message };
}

export function queueComposerProps({
  snapshot,
  commands,
}: OpenSession): Pick<ComposerProps, 'queueWhileRunning' | 'promptQueue'> {
  return {
    queueWhileRunning: true,
    promptQueue: {
      queue: snapshot.promptQueue,
      holds: snapshot.queueHolds,
      command: commands.queueCommand,
    },
  };
}
