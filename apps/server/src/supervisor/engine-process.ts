import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fromCallback } from 'xstate';
import { createRejectionCounter } from '../lib/count-rejections';
import {
  type EngineCommand,
  type EngineEvent,
  EngineMessage,
  WatchModeMessage,
} from './engine-message';

const engineEntry = fileURLToPath(
  new URL('../engine/main.ts', import.meta.url),
);
// Allow the Engine's HTTP close, Session stop, and writer drain limits, plus five seconds.
const killTimeoutMs = 25_000;

// Forks the Engine under tsx; in watch mode Node restarts it on a file change and relays its IPC messages.
export const engineProcess = fromCallback<EngineCommand, { watch: boolean }>(
  ({ input, sendBack, receive }): (() => void) => {
    const send = (event: EngineEvent): void => sendBack(event);
    const child = fork(engineEntry, [], {
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
    // Sends SIGTERM, then SIGKILL if the Engine is still running after the timeout.
    const kill = (): void => {
      child.kill('SIGTERM');
      const forceKill = setTimeout(
        (): boolean => child.kill('SIGKILL'),
        killTimeoutMs,
      );
      forceKill.unref();
      child.once('exit', (): void => clearTimeout(forceKill));
    };

    child.on('message', onMessage);
    child.on('exit', onExit);
    receive((): void => {
      if (hasExited()) {
        send({ type: 'engine.exited' });
        return;
      }
      child.once('exit', (): void => send({ type: 'engine.exited' }));
      kill();
    });
    return (): void => {
      child.off('message', onMessage);
      child.off('exit', onExit);
      if (!hasExited()) kill();
    };
  },
);
