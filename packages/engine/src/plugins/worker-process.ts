import { parentPort, workerData } from 'node:worker_threads';
import { PluginEntry, WorkerCommand } from './runtime-protocol.ts';
import { argoBridge, WorkerCalls } from './worker-argo.ts';
import { registerPlugin, type PluginInbox } from './worker-modules.ts';

const calls = new WorkerCalls((message) => parentPort?.postMessage(message));

/*
 * The listener keeps even a Plugin with no pending work alive, and lets the host
 * detect a blocked worker event loop without running Plugin code in the host.
 */
let inbox: PluginInbox | null = null;

parentPort?.on('message', (message) => {
  const command = WorkerCommand.parse(message);

  if (command === 'ping') parentPort?.postMessage('pong');
  else if (command.type === 'event') inbox?.(JSON.stringify(command.event));
  else calls.settle(command);
});

inbox = await registerPlugin(PluginEntry.parse(workerData), argoBridge(calls));

parentPort?.postMessage('ready');
