export type KitTimer = ReturnType<typeof setTimeout>;

type KitScheduler = {
  schedule: (callback: () => void, ms?: number) => KitTimer;
  cancel: (timer: KitTimer | undefined) => void;
};

declare global {
  // The worker realm sets this before the kit loads; the kit takes it and removes it.
  var __argoKitTimers: KitScheduler | undefined;
}

const handed = globalThis.__argoKitTimers;

delete globalThis.__argoKitTimers;

if (!handed) throw new Error('The kit runs only in a Plugin realm');

/*
 * The kit's own timers, handed in by the worker realm before a Plugin test
 * clock replaces the timer globals, so kit code never reaches a Plugin timer.
 * React's own error rethrow still uses the global; Argo's root error callbacks never throw.
 */
export const kitScheduler: KitScheduler = handed;
