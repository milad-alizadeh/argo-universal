import { parentPort, workerData } from 'node:worker_threads';
import {
  PluginEntry,
  WorkerCommand,
  type WorkerCall,
} from '../protocol/runtime.ts';
import type { TestReply } from '../protocol/test-control.ts';
import { argoBridge, WorkerCalls } from './argo.ts';
import { registerPlugin, type PluginInboxes } from './modules.ts';
import { answerTest, PluginTestClock } from './test-clock.ts';

const post = (
  message: WorkerCall | TestReply | 'pong' | 'ready' | 'executing',
): void => parentPort?.postMessage(message);

const calls = new WorkerCalls(post);

const bridge = argoBridge(calls);

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

function deliverToInbox(
  command: Exclude<Delivery, { type: 'reply' | 'test' }>,
): void {
  if (inboxes) toInbox(inboxes, command);
}

function toInbox(
  { pages, hooks, accounts }: PluginInboxes,
  command: Exclude<Delivery, { type: 'reply' | 'test' }>,
): void {
  if (command.type === 'event') pages(JSON.stringify(command.event));
  else if (command.type === 'accountToken') accounts(JSON.stringify(command));
  else deliverHook(hooks, command);
}

parentPort?.on('message', (message) => {
  const command = WorkerCommand.parse(message);

  if (command === 'ping') post('pong');
  else deliver(command);
});

inboxes = await registerPlugin(entry, bridge, {
  clock,
  executing: () => post('executing'),
});

post('ready');

function deliverHook(
  hooks: PluginInboxes['hooks'],
  command: Extract<Delivery, { type: 'hook' }>,
): void {
  const projectId = command.event.projectId;
  const run = (): void => hooks(JSON.stringify(command));
  bridge.inProject?.(
    typeof projectId === 'string' ? projectId : undefined,
    run,
  );
}
