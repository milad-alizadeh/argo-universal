import { createContext, runInContext } from 'node:vm';
import type { ArgoBridge } from './argo.ts';
import { bundleRealm, type RealmSource } from './realm-bundle.ts';
import type { RealmStart, StartedRealm } from './realm-entry.ts';

export type PluginRealm = ReturnType<typeof createContext>;

export type PluginClock = {
  delay: (ms: number) => Promise<void>;
  now: () => number;
};

export type StartedPluginRealm = StartedRealm & { context: PluginRealm };

const realClock: PluginClock = {
  delay: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  now: Date.now,
};

// The kit takes the real timers as it loads; only Plugin timers and dates use a test clock.
export function createPluginRealm(
  bridge: ArgoBridge,
  source: RealmSource,
  clock?: PluginClock,
): StartedPluginRealm {
  const context = baseRealm(source);

  runInContext(source.api, context);

  if (clock) installClock(context, source, clock);
  const start: RealmStart = runInContext('globalThis.__argoRealm', context);

  runInContext('delete globalThis.__argoRealm', context);

  return { context, ...start(bridge) };
}

// The global names a Plugin realm starts with; `argo plugin validate` refuses the Node ones it lacks.
export async function realmGlobals(): Promise<Set<string>> {
  const names = new Set<string>();
  const context = baseRealm(await bundleRealm());

  context.__argoGlobal = (name: string): Set<string> => names.add(name);
  runInContext(
    'for (const name of Object.getOwnPropertyNames(globalThis)) __argoGlobal(name)',
    context,
  );

  return names;
}

function baseRealm(source: RealmSource): PluginRealm {
  const context = createContext(
    {},
    { codeGeneration: { strings: false, wasm: false } },
  );

  installClock(context, source, realClock);

  return context;
}

function installClock(
  context: PluginRealm,
  source: RealmSource,
  clock: PluginClock,
): void {
  context.__argoDelay = clock.delay;
  context.__argoNow = clock === realClock ? undefined : clock.now;
  runInContext(source.clock, context);
}
