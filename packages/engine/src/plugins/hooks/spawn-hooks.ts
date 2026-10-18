import type { CoreHooks } from '@repo/contracts/plugins';
import { HookPort } from './hook-port';

// The worker whose `argo.process` call the Hooks see.
export type SpawnCaller = { pluginId: string; generation: number };

// Tells the Plugin host a worker is waiting on the Server until the returned stop is called.
export type Waiting = (pluginId: string, generation: number) => () => void;

type SpawnHooksInput = { hooks?: CoreHooks; waiting?: Waiting };

// Without the Server's Hooks, core answers `process.spawn` alone.
const coreOnly = new HookPort().hooks;

const startWaiting = (
  waiting: Waiting | undefined,
  { pluginId, generation }: SpawnCaller,
): (() => void) => waiting?.(pluginId, generation) ?? ((): void => {});

// A starting Plugin waiting on other Plugins' Hooks is still alive, so the host doesn't count it as hanging.
export const spawnHooks =
  (
    { hooks = coreOnly, waiting }: SpawnHooksInput,
    caller: SpawnCaller,
  ): CoreHooks['process.spawn'] =>
  async (event) => {
    const stop = startWaiting(waiting, caller);

    try {
      return await hooks['process.spawn'](event);
    } finally {
      stop();
    }
  };
