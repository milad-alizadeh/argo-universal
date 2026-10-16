import { parentPort, workerData } from 'node:worker_threads';
import { PluginEntry, WorkerCommand } from './runtime-protocol.ts';
import { createArgo, WorkerCalls } from './worker-argo.ts';
import { registerPlugin } from './worker-modules.ts';

const calls = new WorkerCalls((message) => parentPort?.postMessage(message));

/*
 * The listener keeps even a Plugin with no pending work alive, and lets the host
 * detect a blocked worker event loop without running Plugin code in the host.
 */
parentPort?.on('message', (message) => {
  const command = WorkerCommand.parse(message);

  if (command === 'ping') parentPort?.postMessage('pong');
  else calls.settle(command);
});

await registerPlugin(PluginEntry.parse(workerData), createArgo(calls));

parentPort?.postMessage('ready');
