import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fromCallback } from 'xstate';
import {
  WatchModeMessage,
  type WorkerCommand,
  type WorkerEvent,
  WorkerMessage,
} from './worker-message';

const workerEntry = fileURLToPath(
  new URL('../worker/main.ts', import.meta.url),
);
const killTimeoutMs = 5000;

// Forks the worker under tsx; in watch mode Node restarts it on a file change and relays its IPC messages.
export const workerProcess = fromCallback<WorkerCommand, { watch: boolean }>(
  ({ input, sendBack, receive }) => {
    const send = (event: WorkerEvent) => sendBack(event);
    const child = fork(workerEntry, [], {
      execArgv: [
        '--import',
        import.meta.resolve('tsx'),
        ...(input.watch ? ['--watch'] : []),
      ],
    });
    let unrecognisedMessages = 0;

    const onMessage = (raw: unknown) => {
      const message = WorkerMessage.safeParse(raw);
      if (message.success) {
        if (message.data.type === 'ready')
          send({ type: 'worker.ready', port: message.data.port });
        else send({ type: 'worker.heartbeat' });
        return;
      }
      if (WatchModeMessage.safeParse(raw).success) return;
      unrecognisedMessages += 1;
      console.error(
        `supervisor: unrecognised worker message #${unrecognisedMessages}`,
        message.error.issues,
      );
    };
    const onExit = (code: number | null) => send({ type: 'worker.exit', code });

    const hasExited = () =>
      child.exitCode !== null || child.signalCode !== null;
    // Sends SIGTERM, then SIGKILL if the worker is still running after the timeout.
    const kill = () => {
      child.kill('SIGTERM');
      const forceKill = setTimeout(() => child.kill('SIGKILL'), killTimeoutMs);
      forceKill.unref();
      child.once('exit', () => clearTimeout(forceKill));
    };

    child.on('message', onMessage);
    child.on('exit', onExit);
    receive(() => {
      if (hasExited()) {
        send({ type: 'worker.exited' });
        return;
      }
      child.once('exit', () => send({ type: 'worker.exited' }));
      kill();
    });
    return () => {
      child.off('message', onMessage);
      child.off('exit', onExit);
      if (!hasExited()) kill();
    };
  },
);
