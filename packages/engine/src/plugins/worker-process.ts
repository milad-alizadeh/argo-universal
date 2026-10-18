import { parentPort, workerData } from 'node:worker_threads';
import {
  PluginEntry,
  WorkerCommand,
  type WorkerCall,
} from './runtime-protocol.ts';
import { argoBridge, WorkerCalls } from './worker-argo.ts';
import { registerPlugin, type PluginInboxes } from './worker-modules.ts';

const post = (message: WorkerCall | 'pong' | 'ready'): void =>
  parentPort?.postMessage(message);

const calls = new WorkerCalls(post);

/*
 * The listener keeps even a Plugin with no pending work alive, and lets the host
 * detect a blocked worker event loop without running Plugin code in the host.
 */
let inboxes: PluginInboxes | null = null;

type Delivery = Exclude<WorkerCommand, 'ping'>;

function deliver(command: Delivery): void {
  if (command.type === 'reply') calls.settle(command);
  else if (inboxes) toInbox(inboxes, command);
}

function toInbox(
  { pages, hooks }: PluginInboxes,
  command: Exclude<Delivery, { type: 'reply' }>,
): void {
  if (command.type === 'event') pages(JSON.stringify(command.event));
  else hooks(JSON.stringify(command));
}

parentPort?.on('message', (message) => {
  const command = WorkerCommand.parse(message);

  if (command === 'ping') post('pong');
  else deliver(command);
});

inboxes = await registerPlugin(
  PluginEntry.parse(workerData),
  argoBridge(calls),
);

post('ready');
