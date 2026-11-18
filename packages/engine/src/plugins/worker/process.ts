import { parentPort, workerData } from 'node:worker_threads';
import { z } from 'zod';
import { CallScope, originOf } from '../protocol/call-origin.ts';
import {
  consoleMessageLimitBytes,
  PluginEntry,
  WorkerCommand,
  type WorkerMessage,
} from '../protocol/runtime.ts';
import { registerPlugin, type PluginInboxes } from './modules.ts';
import { createPluginBridge, WorkerCalls } from './plugin-bridge.ts';
import type { ConsoleWriter } from './realm.ts';
import { answerTest, PluginTestClock } from './test-clock.ts';

const post = (message: WorkerMessage): void => parentPort?.postMessage(message);

// One worker runs one Plugin. Its clock is independent of the realm clock.
const consoleWindowMs = 1000;

const consoleMessagesPerWindow = 20;

let consoleWindow = -Infinity;

let consoleCount = 0;

function withinConsoleRate(): boolean {
  const now = performance.now();

  if (now - consoleWindow >= consoleWindowMs) {
    consoleWindow = now;
    consoleCount = 0;
  }

  return consoleCount++ < consoleMessagesPerWindow;
}

const writeConsole: ConsoleWriter = (level, text) => {
  // Drop oversized messages whole so a partial secret never reaches redaction.
  if (
    Buffer.byteLength(text) <= consoleMessageLimitBytes &&
    withinConsoleRate()
  )
    post({ type: 'console', level, text });
};

const calls = new WorkerCalls(post);

const scope = new CallScope();

const bridge = createPluginBridge(calls, scope);

// The host bundles the kit once and hands it over, so a worker starts without an esbuild run.
const { entry, kit } = z
  .object({ entry: PluginEntry, kit: z.string() })
  .parse(workerData);

const clock =
  entry.clockStart === undefined
    ? undefined
    : new PluginTestClock(entry.clockStart);

/*
 * The listener keeps even a Plugin with no pending work alive, and lets the host
 * detect a blocked worker event loop without running Plugin code in the host.
 */
let inboxes: PluginInboxes | null = null;

type Delivery = Exclude<WorkerCommand, 'ping'>;

function deliver(command: Delivery): void {
  if (command.type === 'test') void answerTest(clock, command).then(post);
  else if (command.type === 'reply') calls.settle(command);
  else deliverToInbox(command);
}

type ToPlugin = Exclude<Delivery, { type: 'reply' | 'test' }>;

// Plugin code runs inside the origin its delivery names, so every `argo` call it makes is for that.
function deliverToInbox(command: ToPlugin): void {
  const ready = inboxes;

  if (ready) scope.run(originOf(command), () => toInbox(ready, command));
}

function toInbox(
  { pages, hooks, accounts }: PluginInboxes,
  command: ToPlugin,
): void {
  if (command.type === 'event') pages(JSON.stringify(command.event));
  else if (command.type === 'accountToken') accounts(JSON.stringify(command));
  else hooks(JSON.stringify(command));
}

parentPort?.on('message', (message) => {
  const command = WorkerCommand.parse(message);

  if (command === 'ping') post('pong');
  else deliver(command);
});

// Start the Plugin execution deadline after trusted imports, kit bundling and realm setup.
inboxes = await registerPlugin(entry, bridge, {
  kit,
  initialized: () => post('bootstrap-ready'),
  clock,
  writeConsole,
});

post('ready');
