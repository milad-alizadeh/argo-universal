import { fork, type ChildProcess, type Serializable } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { EngineMessage } from '@repo/engine/ipc';
import { resolveRuntimeDirectory } from '@repo/engine/server-runtime';
import { createRejectionCounter } from '@repo/machine-log';
import { fromCallback } from 'xstate';
import {
  type EngineCommand,
  type EngineEvent,
  WatchModeMessage,
} from './engine-message';
import { engineTerminator } from './engine-termination';
import { supportsProcessGroups } from './process-group';

export type EngineChild = ChildProcess;

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
export const defaultKillTimeoutMs = 25_000;

// Forks the Engine as a process group leader, and releases it with every Agent it launched.
export const engineProcess = fromCallback<EngineCommand, EngineProcessInput>(
  ({ input, sendBack, receive }): (() => void) => {
    const home = resolveRuntimeDirectory();
    const child = forkEngine(input);

    const terminate = engineTerminator(
      child,
      home,
      input.killTimeoutMs ?? defaultKillTimeoutMs,
    );

    const detach = watchEngine(child, sendBack);

    receive(
      (): void =>
        void terminate().then((outcome): void => reportExit(sendBack, outcome)),
    );

    return cleanupEngine(detach, terminate);
  },
);

const cleanupEngine =
  (
    detach: () => void,
    terminate: () => Promise<'released' | 'unresolved'>,
  ): (() => void) =>
  () => {
    detach();
    void terminate();
  };

const forkEngine = (input: EngineProcessInput): ChildProcess =>
  fork(input.entry ?? engineEntry, [], {
    detached: supportsProcessGroups,
    execArgv: [
      '--import',
      import.meta.resolve('tsx'),
      ...(input.watch ? ['--watch'] : []),
    ],
  });

const reportExit = (
  send: (event: EngineEvent) => void,
  outcome: 'released' | 'unresolved',
): void =>
  send({
    type: outcome === 'released' ? 'engine.exited' : 'engine.unresolved',
  });

const watchEngine = (
  child: ChildProcess,
  send: (event: EngineEvent) => void,
): (() => void) => {
  const onMessage = messageReceiver(send);

  const onExit = (code: number | null): void =>
    send({ type: 'engine.exit', code });

  child.on('message', onMessage);
  child.on('exit', onExit);

  return (): void => {
    child.off('message', onMessage);
    child.off('exit', onExit);
  };
};

const messageReceiver = (
  send: (event: EngineEvent) => void,
): ((raw: Serializable) => void) => {
  const rejections = createRejectionCounter('supervisor');

  return (raw: Serializable): void => {
    const message = EngineMessage.safeParse(raw);

    if (message.success) return relayMessage(send, message.data);

    if (WatchModeMessage.safeParse(raw).success) return;

    rejections.report('unrecognised engine message', message.error.issues);
  };
};

const relayMessage = (
  send: (event: EngineEvent) => void,
  message: typeof EngineMessage._output,
): void => {
  if (message.type === 'ready')
    send({ type: 'engine.ready', port: message.port });
  else send({ type: 'engine.heartbeat' });
};
