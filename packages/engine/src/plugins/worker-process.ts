import { parentPort, workerData } from 'node:worker_threads';
import type { ClockReply } from './clock-protocol.ts';
import {
  PluginEntry,
  WorkerCommand,
  type WorkerCall,
} from './runtime-protocol.ts';
import { PluginTestClock } from './test-clock.ts';
import { argoBridge, WorkerCalls } from './worker-argo.ts';
import { registerPlugin, type PluginInboxes } from './worker-modules.ts';

const post = (message: WorkerCall | ClockReply | 'pong' | 'ready'): void =>
  parentPort?.postMessage(message);

const calls = new WorkerCalls(post);

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
  if (command.type === 'clock.advance') void advanceClock(command);
  else if (command.type === 'reply') calls.settle(command);
  else deliverToInbox(command);
}

function deliverToInbox(
  command: Exclude<Delivery, { type: 'reply' | 'clock.advance' }>,
): void {
  if (inboxes) toInbox(inboxes, command);
}

function toInbox(
  { pages, hooks }: PluginInboxes,
  command: Exclude<Delivery, { type: 'reply' | 'clock.advance' }>,
): void {
  if (command.type === 'event') pages(JSON.stringify(command.event));
  else hooks(JSON.stringify(command));
}

parentPort?.on('message', (message) => {
  const command = WorkerCommand.parse(message);

  if (command === 'ping') post('pong');
  else deliver(command);
});

inboxes = await registerPlugin(entry, argoBridge(calls), clock);

post('ready');

async function advanceClock(
  command: Extract<Delivery, { type: 'clock.advance' }>,
): Promise<void> {
  try {
    if (!clock) throw new Error('Plugin has no test clock');
    await clock.advance(command.ms);
    post({ type: 'clock.advanced', id: command.id });
  } catch (error) {
    post({ type: 'clock.advanced', id: command.id, error: String(error) });
  }
}
