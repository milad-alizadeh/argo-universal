import { fromCallback } from 'xstate';

export type StopReason = 'SIGINT' | 'SIGTERM' | 'IPC channel closed';
export type WorkerStop = { type: 'worker.stop'; reason: StopReason };

// Turns SIGINT, SIGTERM and a closed IPC channel into `worker.stop`; a closed channel means nobody can restart or stop this worker.
export const processSignals = fromCallback(({ sendBack }) => {
  const stop = (reason: StopReason) => () =>
    sendBack({ type: 'worker.stop', reason } satisfies WorkerStop);
  const onSigint = stop('SIGINT');
  const onSigterm = stop('SIGTERM');
  const onDisconnect = stop('IPC channel closed');
  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);
  process.on('disconnect', onDisconnect);
  return () => {
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigterm);
    process.off('disconnect', onDisconnect);
  };
});
