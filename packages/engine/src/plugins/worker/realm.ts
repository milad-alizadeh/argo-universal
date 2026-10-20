import { createContext, runInContext } from 'node:vm';
import { realClock, type PluginClock } from '../clock.ts';
import type { ArgoBridge } from './argo.ts';
import { kitPrelude } from './kit-prelude.ts';
import type { PluginRealmExports } from './plugin-api.ts';

export type PluginRealm = ReturnType<typeof createContext>;

export type { PluginClock } from '../clock.ts';

type StartedRealm = PluginRealmExports & { context: PluginRealm };

// The kit takes the real timers as it loads; only Plugin timers and dates use a test clock.
export function createPluginRealm(
  bridge: ArgoBridge,
  kitSource: string,
  clock?: PluginClock,
): StartedRealm {
  const context = baseRealm({ __argoBridge: bridge });
  runInContext(kitSource, context);

  if (clock) installClock(context, clock);

  const started: PluginRealmExports = runInContext(
    'globalThis.__argoRealm',
    context,
  );

  runInContext('delete globalThis.__argoRealm', context);

  return { context, ...started };
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
