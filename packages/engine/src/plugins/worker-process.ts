import { parentPort, workerData } from 'node:worker_threads';
import {
  PluginEntry,
  WorkerCommand,
  type WorkerCall,
} from './runtime-protocol.ts';
import { PluginTestClock } from './test-clock.ts';
import type { TestAction, TestReply } from './test-control.ts';
import { argoBridge, WorkerCalls } from './worker-argo.ts';
import { registerPlugin, type PluginInboxes } from './worker-modules.ts';

const post = (message: WorkerCall | TestReply | 'pong' | 'ready'): void =>
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
  if (command.type === 'test') void runTest(command);
  else if (command.type === 'reply') calls.settle(command);
  else deliverToInbox(command);
}

function deliverToInbox(
  command: Exclude<Delivery, { type: 'reply' | 'test' }>,
): void {
  if (inboxes) toInbox(inboxes, command);
}

function toInbox(
  { pages, hooks }: PluginInboxes,
  command: Exclude<Delivery, { type: 'reply' | 'test' }>,
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

async function runTest(
  command: Extract<Delivery, { type: 'test' }>,
): Promise<void> {
  try {
    await perform(command.request);
    post({ type: 'test.done', id: command.id });
  } catch (error) {
    post({ type: 'test.done', id: command.id, error: String(error) });
  }
}

// Advancing the clock is the only test action so far.
function perform(action: TestAction): Promise<void> {
  if (!clock) throw new Error('Plugin has no test clock');

  return clock.advance(action.ms);
}
