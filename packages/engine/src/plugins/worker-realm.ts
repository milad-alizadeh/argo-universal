import { createContext, runInContext } from 'node:vm';
import { kitPrelude } from './kit-prelude.ts';
import { argoSource, type ArgoBridge } from './worker-argo.ts';

export type PluginRealm = ReturnType<typeof createContext>;

export type PluginClock = {
  delay: (ms: number) => Promise<void>;
  now: () => number;
};

const realClock: PluginClock = {
  delay: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  now: Date.now,
};

// The kit retains its real scheduler; only Plugin timers and dates use a test clock.
export function createPluginRealm(
  bridge: ArgoBridge,
  kitSource: string,
  clock?: PluginClock,
): PluginRealm {
  const context = createContext(
    { __argoBridge: bridge },
    { codeGeneration: { strings: false, wasm: false } },
  );

  installClock(context, realClock);
  runInContext(kitSource, context);

  if (clock) installClock(context, clock);
  runInContext(`globalThis.argo = ${argoSource}`, context);

  return context;
}

function installClock(context: PluginRealm, clock: PluginClock): void {
  context.__argoDelay = clock.delay;
  context.__argoNow = clock === realClock ? undefined : clock.now;
  runInContext(kitPrelude, context);
}
