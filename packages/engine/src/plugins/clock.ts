// The runtime and worker use the same clock contract for elapsed time and deadlines.
export type PluginClock = {
  now: () => number;
  delay: (ms: number) => Promise<void>;
  schedule: (callback: () => void, ms: number) => () => void;
};

export const realClock: PluginClock = {
  now: Date.now,
  delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  schedule: (callback, ms) => {
    const timer = setTimeout(callback, ms);

    return () => clearTimeout(timer);
  },
};
