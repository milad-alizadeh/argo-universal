import { parentPort } from 'node:worker_threads';

/*
 * The worker's entry is this file alone: it signals that it is alive before the rest of the worker's module graph loads, which can
 * take seconds on a loaded machine. The host's liveness deadline counts only the time until this line.
 */
parentPort?.postMessage('alive');

await import('./run.ts');
