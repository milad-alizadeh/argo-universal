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
  const context = baseRealm({ __argoBridge: bridge });
  runInContext(kitSource, context);

  if (clock) installClock(context, clock);
  runInContext(`globalThis.argo = ${argoSource}`, context);

  return context;
}

// The global names a Plugin realm starts with; `argo plugin validate` refuses the Node ones it lacks.
export function realmGlobals(): Set<string> {
  const names = new Set<string>();
  const context = baseRealm({});
  context.__argoGlobal = (name: string): Set<string> => names.add(name);
  runInContext(
    'for (const name of Object.getOwnPropertyNames(globalThis)) __argoGlobal(name)',
    context,
  );

  return names;
}

function baseRealm(globals: { __argoBridge?: ArgoBridge }): PluginRealm {
  const context = createContext(globals, {
    codeGeneration: { strings: false, wasm: false },
  });

  installClock(context, realClock);

  return context;
}

function installClock(context: PluginRealm, clock: PluginClock): void {
  context.__argoDelay = clock.delay;
  context.__argoNow = clock === realClock ? undefined : clock.now;
  runInContext(kitPrelude, context);
}
