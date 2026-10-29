// Every wait on a child process, in one place.

// How often a waiter looks again.
export const pollIntervalMs = 200;

// How long a starting process gets to become ready.
export const startLimitMs = 30_000;

// How long a starter waits for a process it asked to stop before it stops waiting.
export const stopLimitMs = 5000;

// How long a stopped child gets to exit before its group is killed: room for a long graceful shutdown.
export const stopGraceMs = 25_000;

export const millisecondsPerSecond = 1000;
