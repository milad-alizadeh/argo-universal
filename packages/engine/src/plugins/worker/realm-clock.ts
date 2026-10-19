/*
 * Runs in a Plugin's realm ahead of the kit (`bundleRealm`), and again when a test clock replaces it.
 * Timers are realm-local functions; only their delay crosses to the worker clock.
 */
declare global {
  // The worker sets these just before this runs; it takes them and removes them.
  var __argoNow: (() => number) | undefined;
  var __argoDelay: ((ms: number) => Promise<void>) | undefined;
}

// A test clock's dates; the real clock leaves the realm's own `Date`.
function installDate(now: () => number): void {
  const NativeDate = globalThis.Date;

  function ClockDate(...args: []): Date | string {
    if (!new.target) return new NativeDate(now()).toString();

    return Reflect.construct(
      NativeDate,
      args.length ? args : [now()],
      new.target,
    );
  }

  Object.setPrototypeOf(ClockDate, NativeDate);
  ClockDate.prototype = NativeDate.prototype;
  ClockDate.now = (): number => now();
  Object.assign(globalThis, { Date: ClockDate });
}

function installTimers(delay: (ms: number) => Promise<void>): void {
  const timers = new Map<number, () => void>();
  let next = 0;

  Object.assign(globalThis, {
    setTimeout: (callback: () => void, ms = 0): number => {
      const id = next++;

      timers.set(id, callback);
      delay(ms).then(() => fire(timers, id));

      return id;
    },
    clearTimeout: (id: number): boolean => timers.delete(id),
  });
}

// A timer cleared while its delay ran doesn't fire.
function fire(timers: Map<number, () => void>, id: number): void {
  const run = timers.get(id);

  timers.delete(id);
  run?.();
}

const now = globalThis.__argoNow;

delete globalThis.__argoNow;

const delay = globalThis.__argoDelay;

delete globalThis.__argoDelay;

if (now) installDate(now);

if (delay) installTimers(delay);

// A Plugin's console goes nowhere: its worker's output is the Server's.
const silent = (): void => {};

Object.assign(globalThis, {
  console: {
    log: silent,
    info: silent,
    warn: silent,
    error: silent,
    debug: silent,
  },
});

export {};
