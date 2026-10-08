import { fromCallback } from 'xstate';

type StopCallback = () => void;

export type StopReason = 'SIGINT' | 'SIGTERM' | 'IPC channel closed';
export type EngineStop = { type: 'engine.stop'; reason: StopReason };

// Turns SIGINT, SIGTERM and a closed IPC channel into `engine.stop`; a closed channel means nobody can restart or stop this Engine.
export const processSignals = fromCallback(({ sendBack }): StopCallback => {
  const stop =
    (reason: StopReason): StopCallback =>
    (): void =>
      sendBack({ type: 'engine.stop', reason } satisfies EngineStop);
  const onSigint = stop('SIGINT');
  const onSigterm = stop('SIGTERM');
  const onDisconnect = stop('IPC channel closed');
  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);
  process.on('disconnect', onDisconnect);
  return (): void => {
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigterm);
    process.off('disconnect', onDisconnect);
  };
});
