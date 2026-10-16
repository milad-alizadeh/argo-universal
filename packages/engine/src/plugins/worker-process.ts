import { parentPort, workerData } from 'node:worker_threads';
import {
  PluginEntry,
  WorkerCommand,
  type WorkerCall,
} from './runtime-protocol.ts';
import { argoBridge, WorkerCalls } from './worker-argo.ts';
import { registerPlugin, type PluginInbox } from './worker-modules.ts';

const post = (message: WorkerCall | 'pong' | 'ready'): void =>
  parentPort?.postMessage(message);

const calls = new WorkerCalls(post);

/*
 * The listener keeps even a Plugin with no pending work alive, and lets the host
 * detect a blocked worker event loop without running Plugin code in the host.
 */
let inbox: PluginInbox | null = null;

function deliver(command: Exclude<WorkerCommand, 'ping'>): void {
  if (command.type === 'event') inbox?.(JSON.stringify(command.event));
  else calls.settle(command);
}

parentPort?.on('message', (message) => {
  const command = WorkerCommand.parse(message);

  if (command === 'ping') post('pong');
  else deliver(command);
});

inbox = await registerPlugin(PluginEntry.parse(workerData), argoBridge(calls));

post('ready');
