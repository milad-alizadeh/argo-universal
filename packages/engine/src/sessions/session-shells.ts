import type { ShellRecord } from '@repo/contracts';
import { ShellRuntime } from './acp/shells/shell-runtime';
import {
  storageFailingEvent,
  type SessionMachineInput,
} from './session-context';

type ShellSession = {
  send: (
    event:
      | { type: 'agent.shellChanged'; shell: ShellRecord }
      | { type: typeof storageFailingEvent },
  ) => void;
};

// The Session's Shells report back to it: a change updates its list, a storage failure cancels the Turn.
export const createShellRuntime = (
  input: SessionMachineInput,
  session: ShellSession,
): ShellRuntime =>
  new ShellRuntime({
    sessionId: input.sessionId,
    home: input.runtimeDirectory,
    writer: input.writer,
    now: input.now,
    createId: input.createId,
    changed: (shell): void =>
      session.send({ type: 'agent.shellChanged', shell }),
    failed: (error): void => {
      console.error('Shell storage failed', error);
      session.send({ type: storageFailingEvent });
    },
  });

export const withShell = (
  shells: readonly ShellRecord[],
  shell: ShellRecord,
): ShellRecord[] => [...shells.filter(({ id }) => id !== shell.id), shell];
