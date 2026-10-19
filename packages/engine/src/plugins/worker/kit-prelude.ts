// Timers are realm-local functions; only their delay crosses to the worker clock.
export const kitPrelude = `
  (() => {
    const now = globalThis.__argoNow;
    delete globalThis.__argoNow;
    if (now) {
    const NativeDate = globalThis.Date;
    function ClockDate(...args) {
      if (!new.target) return new NativeDate(now()).toString();
      return Reflect.construct(NativeDate, args.length ? args : [now()], new.target);
    }
    Object.setPrototypeOf(ClockDate, NativeDate);
    ClockDate.prototype = NativeDate.prototype;
    ClockDate.now = () => now();
    globalThis.Date = ClockDate;
    }
    const delay = globalThis.__argoDelay;
    delete globalThis.__argoDelay;
    const timers = new Map();
    let next = 0;
    globalThis.setTimeout = (callback, ms = 0) => {
      const id = next++;
      timers.set(id, callback);
      delay(ms).then(() => {
        const run = timers.get(id);
        timers.delete(id);
        if (run) run();
      });
      return id;
    };
    globalThis.clearTimeout = (id) => timers.delete(id);
  })();
  globalThis.console = { log() {}, info() {}, warn() {}, error() {}, debug() {} };
`;
