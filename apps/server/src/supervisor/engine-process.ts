import { fileURLToPath } from 'node:url';
import { EngineMessage } from '@repo/engine/ipc';
import { resolveRuntimeDirectory } from '@repo/engine/server-runtime';
import { releaseShellGroups } from '@repo/engine/shell-runtime';
import { createRejectionCounter } from '@repo/machine-log';
import {
  type ChildHandle,
  type ChildMessage,
  type GroupRelease,
  startChild,
  stopGraceMs,
} from '@repo/process';
import { fromCallback } from 'xstate';
import {
  type EngineCommand,
  type EngineEvent,
  WatchModeMessage,
} from './engine-message';

const engineEntry = fileURLToPath(
  new URL('../engine/main.ts', import.meta.url),
);

export interface EngineProcessInput {
  watch: boolean;
  // Tests start a stand-in Engine and shorten the kill timeout.
  entry?: string;
  killTimeoutMs?: number;
}

type Send = (event: EngineEvent) => void;

// Where the Engine recorded its Shells, and how long it gets to stop before its group is killed.
type ReleaseLimits = { home: string; graceMs: number };

// Starts the Engine as a process group leader, and releases it with every Agent and Shell it launched.
export const engineProcess = fromCallback<EngineCommand, EngineProcessInput>(
  ({ input, sendBack, receive }): (() => void) => {
    const engine = startEngine(input);
    const release = engineRelease(engine, input);
    const detach = watchEngine(engine, sendBack);

    receive(
      (): void =>
        void release().then((outcome): void => reportExit(sendBack, outcome)),
    );

    return (): void => {
      detach();
      void release();
    };
  },
);

const startEngine = (input: EngineProcessInput): ChildHandle =>
  startChild(
    {
      label: 'Engine',
      entry: input.entry ?? engineEntry,
      execArgv: [
        '--import',
        import.meta.resolve('tsx'),
        ...(input.watch ? ['--watch'] : []),
      ],
    },
    { messages: true },
  );

// The Engine's group goes first, then its recorded Shell groups; one release serves every caller, since two would race on Shell records.
const engineRelease = (
  engine: ChildHandle,
  input: EngineProcessInput,
): (() => Promise<GroupRelease>) => {
  const limits = {
    home: resolveRuntimeDirectory(),
    // The grace covers the Engine's HTTP close, Session stop and writer drain limits, plus five seconds.
    graceMs: input.killTimeoutMs ?? stopGraceMs,
  };

  let releasing: Promise<GroupRelease> | undefined;

  return (): Promise<GroupRelease> => {
    releasing ??= releaseEngine(engine, limits);

    return releasing;
  };
};

const releaseEngine = async (
  engine: ChildHandle,
  { home, graceMs }: ReleaseLimits,
): Promise<GroupRelease> => {
  if ((await engine.stop(graceMs)) !== 'released') return 'unresolved';

  try {
    await releaseShellGroups(home);

    return 'released';
  } catch {
    return 'unresolved';
  }
};

const reportExit = (send: Send, outcome: GroupRelease): void =>
  send({
    type: outcome === 'released' ? 'engine.exited' : 'engine.unresolved',
  });

const watchEngine = (engine: ChildHandle, send: Send): (() => void) => {
  let watching = true;
  const stopListening = engine.onMessage(messageReceiver(send));

  void engine.exited.then((exit): void => {
    if (watching) send({ type: 'engine.exit', code: exit.code });
  });

  return (): void => {
    watching = false;
    stopListening();
  };
};

const messageReceiver = (send: Send): ((raw: ChildMessage) => void) => {
  const rejections = createRejectionCounter('supervisor');

  return (raw: ChildMessage): void => {
    const message = EngineMessage.safeParse(raw);

    if (message.success) return relayMessage(send, message.data);

    if (WatchModeMessage.safeParse(raw).success) return;

    rejections.report('unrecognised engine message', message.error.issues);
  };
};

const relayMessage = (
  send: Send,
  message: typeof EngineMessage._output,
): void => {
  if (message.type === 'ready')
    send({ type: 'engine.ready', port: message.port });
  else send({ type: 'engine.heartbeat' });
};
