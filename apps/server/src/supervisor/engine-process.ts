import { fork, type Serializable } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { releaseInstallationProcessGroups } from '@repo/engine/installation-runtime';
import { EngineMessage } from '@repo/engine/ipc';
import { releaseLoginTerminalGroups } from '@repo/engine/login-terminal-runtime';
import { resolveRuntimeDirectory } from '@repo/engine/server-runtime';
import { releaseShellGroups } from '@repo/engine/shell-runtime';
import { createRejectionCounter } from '@repo/machine-log';
import { fromCallback } from 'xstate';
import {
  type EngineCommand,
  type EngineEvent,
  WatchModeMessage,
} from './engine-message';
import { releaseProcessGroup, supportsProcessGroups } from './process-group';

const engineEntry = fileURLToPath(
  new URL('../engine/main.ts', import.meta.url),
);

export interface EngineProcessInput {
  watch: boolean;
  // Tests fork a stand-in Engine and shorten the kill timeout.
  entry?: string;
  killTimeoutMs?: number;
}

// Allow the Engine's HTTP close, Session stop, and writer drain limits, plus five seconds.
const killTimeoutMs = 25_000;

const releaseEngineGroups = async (
  pid: number,
  home: string,
): Promise<'released' | 'unresolved'> => {
  if ((await releaseProcessGroup(pid)) !== 'released') return 'unresolved';

  try {
    await releaseInstallationProcessGroups(home);
    await releaseLoginTerminalGroups(home);
    await releaseShellGroups(home);

    return 'released';
  } catch {
    return 'unresolved';
  }
};

// Forks the Engine under tsx as the leader of its own process group, so the Engine and every Agent it launched can be released together; in watch mode Node restarts it on a file change and relays its IPC messages.
export const engineProcess = fromCallback<EngineCommand, EngineProcessInput>(
  ({ input, sendBack, receive }): (() => void) => {
    const home = resolveRuntimeDirectory();
    const send = (event: EngineEvent): void => sendBack(event);

    const child = fork(input.entry ?? engineEntry, [], {
      detached: supportsProcessGroups,
      execArgv: [
        '--import',
        import.meta.resolve('tsx'),
        ...(input.watch ? ['--watch'] : []),
      ],
    });

    const rejections = createRejectionCounter('supervisor');

    const onMessage = (raw: Serializable): void => {
      const message = EngineMessage.safeParse(raw);

      if (message.success) {
        if (message.data.type === 'ready')
          send({ type: 'engine.ready', port: message.data.port });
        else send({ type: 'engine.heartbeat' });

        return;
      }

      if (WatchModeMessage.safeParse(raw).success) return;
      rejections.report('unrecognised engine message', message.error.issues);
    };

    const onExit = (code: number | null): void =>
      send({ type: 'engine.exit', code });

    const hasExited = (): boolean =>
      child.exitCode !== null || child.signalCode !== null;

    const exited = new Promise<void>((resolve): void => {
      if (hasExited()) resolve();
      else child.once('exit', (): void => resolve());
    });

    // Without a pid nothing was spawned, so no group exists.
    const release = async (): Promise<'released' | 'unresolved'> =>
      child.pid === undefined
        ? 'released'
        : releaseEngineGroups(child.pid, home);

    // Asks the Engine to stop, kills its group after the timeout, then proves the whole group is gone.
    const terminate = async (): Promise<'released' | 'unresolved'> => {
      if (!hasExited()) {
        child.kill('SIGTERM');

        const forceKill = setTimeout(
          (): void => void release(),
          input.killTimeoutMs ?? killTimeoutMs,
        );

        await exited;
        clearTimeout(forceKill);
      }

      return release();
    };

    child.on('message', onMessage);
    child.on('exit', onExit);
    receive((): void => {
      void terminate().then((outcome): void =>
        send({
          type: outcome === 'released' ? 'engine.exited' : 'engine.unresolved',
        }),
      );
    });

    return (): void => {
      child.off('message', onMessage);
      child.off('exit', onExit);
      // The Supervisor is going away; take the whole group down with the Engine.
      void terminate();
    };
  },
);
