type Timer = ReturnType<typeof globalThis.setTimeout>;

/*
 * The kit's only timers. A Plugin test clock replaces the realm's timer globals, so they are read each time one is
 * set, not once when this module loads.
 */
export const kitScheduler = {
  schedule: (callback: () => void, ms: number): Timer =>
    globalThis.setTimeout(callback, ms),
  cancel: (timer: Timer): void => {
    globalThis.clearTimeout(timer);
  },
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((done) => kitScheduler.schedule(done, ms));
