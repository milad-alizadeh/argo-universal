import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { EngineMessage } from '@repo/engine/ipc';
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
// Allow the Engine's HTTP close, Session stop, and writer drain limits, plus five seconds.
const killTimeoutMs = 25_000;

// Forks the Engine under tsx as the leader of its own process group, so the Engine and every Agent it launched can be released together; in watch mode Node restarts it on a file change and relays its IPC messages.
export const engineProcess = fromCallback<EngineCommand, { watch: boolean }>(
  ({ input, sendBack, receive }): (() => void) => {
    const send = (event: EngineEvent): void => sendBack(event);
    const child = fork(engineEntry, [], {
      detached: supportsProcessGroups,
      execArgv: [
        '--import',
        import.meta.resolve('tsx'),
        ...(input.watch ? ['--watch'] : []),
      ],
    });
    const rejections = createRejectionCounter('supervisor');

    const onMessage = (raw: unknown): void => {
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
      child.pid === undefined ? 'released' : releaseProcessGroup(child.pid);
    // Asks the Engine to stop, kills it after the timeout, then proves its whole group is gone.
    const stop = async (): Promise<void> => {
      if (!hasExited()) {
        child.kill('SIGTERM');
        const forceKill = setTimeout(
          (): boolean => child.kill('SIGKILL'),
          killTimeoutMs,
        );
        await exited;
        clearTimeout(forceKill);
      }
      const outcome = await release();
      send({
        type: outcome === 'released' ? 'engine.exited' : 'engine.unresolved',
      });
    };

    child.on('message', onMessage);
    child.on('exit', onExit);
    receive((): void => {
      void stop();
    });
    return (): void => {
      child.off('message', onMessage);
      child.off('exit', onExit);
      // The Supervisor is going away; take the whole group down with the Engine.
      if (!hasExited()) {
        child.kill('SIGTERM');
        setTimeout((): void => void release(), killTimeoutMs).unref();
      }
      void exited.then((): Promise<unknown> => release());
    };
  },
);
