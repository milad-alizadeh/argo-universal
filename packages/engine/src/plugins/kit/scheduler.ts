export type KitTimer = ReturnType<typeof setTimeout>;

type KitScheduler = {
  schedule: (callback: () => void, ms?: number) => KitTimer;
  cancel: (timer: KitTimer | undefined) => void;
};

/*
 * The kit's own timers: the realm's timers as the kit loads, before a Plugin test
 * clock replaces the timer globals, so kit code never reaches a Plugin timer.
 * React's own error rethrow still uses the global; Argo's root error callbacks never throw.
 */
export const kitScheduler: KitScheduler = {
  schedule: setTimeout,
  cancel: clearTimeout,
};
