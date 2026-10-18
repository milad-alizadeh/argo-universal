// Timers are realm-local functions; only their delay crosses to the worker clock.
export const kitPrelude = `
  (() => {
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
