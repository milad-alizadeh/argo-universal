import { parentPort, workerData } from 'node:worker_threads';
import {
  PluginEntry,
  WorkerCommand,
  type WorkerCall,
} from '../protocol/runtime.ts';
import type {
  TestAction,
  TestReply,
  TestClockState,
} from '../protocol/test-control.ts';
import { argoBridge, WorkerCalls } from './argo.ts';
import { registerPlugin, type PluginInboxes } from './modules.ts';
import { PluginTestClock } from './test-clock.ts';

const post = (message: WorkerCall | TestReply | 'pong' | 'ready'): void =>
  parentPort?.postMessage(message);

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

inboxes = await registerPlugin(entry, bridge, clock);

post('ready');

async function runTest(
  command: Extract<Delivery, { type: 'test' }>,
): Promise<void> {
  try {
    const state = await runTestAction(command.action);
    post({ type: 'test.done', id: command.id, clock: state });
  } catch (error) {
    post({ type: 'test.done', id: command.id, error: String(error) });
  }
}

async function runTestAction(action: TestAction): Promise<TestClockState> {
  if (!clock) throw new Error('Plugin has no test clock');

  await clock.advance(action.action === 'advanceClock' ? action.ms : 0);

  return { now: clock.now(), nextAt: clock.nextAt() };
}

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
