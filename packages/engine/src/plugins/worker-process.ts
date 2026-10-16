import { parentPort, workerData } from 'node:worker_threads';
import { PluginEntry } from './runtime-protocol.ts';
import { registerPlugin } from './worker-modules.ts';

/*
 * The listener keeps even a Plugin with no pending work alive, and lets the host
 * detect a blocked worker event loop without running Plugin code in the host.
 */
parentPort?.on('message', () => parentPort?.postMessage('pong'));

await registerPlugin(PluginEntry.parse(workerData));

parentPort?.postMessage('ready');
