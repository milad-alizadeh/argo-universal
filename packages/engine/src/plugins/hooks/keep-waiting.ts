import type { HookWaiting } from '@repo/contracts/plugins/hook-protocol';
import type { z } from 'zod';

// Well inside the host's 3 seconds, so a starting worker's deadline never runs out between two messages.
const waitingIntervalMs = 1000;

type WaitingCommand = z.infer<typeof HookWaiting>;

// Until stopped, tells the host each second that the Server is still answering this worker.
export function keepWaiting(
  tell: (command: WaitingCommand) => void,
  command: Omit<WaitingCommand, 'type'>,
): () => void {
  const told = (): void => tell({ type: 'waiting', ...command });
  const timer = setInterval(told, waitingIntervalMs);

  told();

  return () => clearInterval(timer);
}
