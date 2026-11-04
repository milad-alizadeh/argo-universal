import { parentPort, workerData } from 'node:worker_threads';
import { CallScope, originOf } from '../protocol/call-origin.ts';
import {
  PluginEntry,
  WorkerCommand,
  type WorkerCall,
} from '../protocol/runtime.ts';
import type { TestReply } from '../protocol/test-control.ts';
import { registerPlugin, type PluginInboxes } from './modules.ts';
import { createPluginBridge, WorkerCalls } from './plugin-bridge.ts';
import { answerTest, PluginTestClock } from './test-clock.ts';

const post = (
  message: WorkerCall | TestReply | 'bootstrap-ready' | 'pong' | 'ready',
): void => parentPort?.postMessage(message);

const calls = new WorkerCalls(post);

const scope = new CallScope();

const bridge = createPluginBridge(calls, scope);

const entry = PluginEntry.parse(workerData);

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
  initialized: () => post('bootstrap-ready'),
  clock,
});

post('ready');
