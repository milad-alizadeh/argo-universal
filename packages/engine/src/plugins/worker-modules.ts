import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  createContext,
  runInContext,
  SourceTextModule,
  SyntheticModule,
  type Module,
} from 'node:vm';
import { kitPrelude } from './kit-prelude.ts';
import { bundleKit } from './kit/bundle.ts';
import type { Kit } from './kit/plugin-kit.ts';
import { requirePluginFile } from './plugin-files.ts';
import type { PluginEntry } from './runtime-protocol.ts';
import { argoSource, type ArgoBridge } from './worker-argo.ts';

/*
 * The context deliberately has no Node globals; the frozen `argo` object, built inside the context, is its only way out. This is a
 * first-party execution boundary, not a security boundary for untrusted code.
 */
export async function registerPlugin(
  entry: PluginEntry,
  bridge: ArgoBridge,
): Promise<PluginInboxes> {
  const context = sandbox(bridge, await bundleKit());
  const { inboxes, kit } = takeKit(context);

  await bootstrap(context, new PluginModules(entry, context, kit));

  return inboxes;
}

async function bootstrap(
  context: PluginRealm,
  modules: PluginModules,
): Promise<void> {
  const module = registrationModule(context);

  await module.link((specifier, referencing) =>
    referencing === module
      ? modules.entryModule()
      : modules.link(specifier, referencing),
  );
  await module.evaluate();
}

// How the worker reaches a Plugin's pages and Hooks: a JSON string in, nothing out.
type PluginInbox = (json: string) => void;

export type PluginInboxes = { pages: PluginInbox; hooks: PluginInbox };

interface KitModules {
  kit: Kit['exports'];
  jsxRuntime: Kit['jsxRuntime'];
}

interface TakenKit {
  inboxes: PluginInboxes;
  kit: KitModules;
}

type PluginRealm = ReturnType<typeof createContext>;

// The kit runs first, with microtask timers for its scheduler; `argoSource` then builds the frozen `argo` from it and removes the bridge.
function sandbox(bridge: ArgoBridge, kitSource: string): PluginRealm {
  const context = createContext(
    {
      __argoBridge: bridge,
      __argoDelay: (delay: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, delay)),
    },
    { codeGeneration: { strings: false, wasm: false } },
  );

  runInContext(kitPrelude, context);
  runInContext(kitSource, context);
  runInContext(`globalThis.argo = ${argoSource}`, context);

  return context;
}

// What the kit and `argo` left behind for the worker: the inboxes for pages and Hooks, and the modules `@argo/plugin-kit` serves.
function takeKit(context: PluginRealm): TakenKit {
  const pages: PluginInbox = runInContext('globalThis.__argoInbox', context);
  const hooks: PluginInbox = runInContext('globalThis.__argoHooks', context);
  const exported: Kit = runInContext('globalThis.__argoKitExports', context);

  runInContext(
    'delete globalThis.__argoInbox; delete globalThis.__argoHooks; delete globalThis.__argoKitExports',
    context,
  );

  return {
    inboxes: { pages, hooks },
    kit: { kit: exported.exports, jsxRuntime: exported.jsxRuntime },
  };
}

const registrationModule = (context: PluginRealm): SourceTextModule =>
  new SourceTextModule(
    'import { register } from "./entry"; await register(argo);',
    { context },
  );

class PluginModules {
  private readonly modules = new Map<string, Promise<SourceTextModule>>();

  private readonly entry: PluginEntry;
  private readonly context: PluginRealm;
  private readonly kit: KitModules;

  constructor(entry: PluginEntry, context: PluginRealm, kit: KitModules) {
    this.entry = entry;
    this.context = context;
    this.kit = kit;
  }

  entryModule(): Promise<SourceTextModule> {
    return this.load(resolve(this.entry.directory, this.entry.main));
  }

  private synthetic(values: KitModules[keyof KitModules]): SyntheticModule {
    return new SyntheticModule(
      Object.keys(values),
      function (this: SyntheticModule) {
        for (const [name, value] of Object.entries(values))
          this.setExport(name, value);
      },
      { context: this.context },
    );
  }

  private load(path: string): Promise<SourceTextModule> {
    const existing = this.modules.get(path);

    if (existing) return existing;
    const module = this.createModule(path);
    this.modules.set(path, module);

    return module;
  }

  private async createModule(path: string): Promise<SourceTextModule> {
    const source = await this.source(path);

    return new SourceTextModule(source, {
      context: this.context,
      identifier: path,
    });
  }

  private async source(path: string): Promise<string> {
    if (this.entry.source !== undefined) return this.entry.source;
    const target = await requirePluginFile(this.entry.directory, path);

    return builtModuleSource(await readFile(target, 'utf8'), target);
  }

  private builtin(specifier: string): SyntheticModule | null {
    if (specifier === kitSpecifier) return this.synthetic(this.kit.kit);

    return specifier === `${kitSpecifier}/jsx-runtime`
      ? this.synthetic(this.kit.jsxRuntime)
      : null;
  }

  async link(specifier: string, referencing: Module): Promise<Module> {
    const builtin = this.builtin(specifier);

    if (builtin) return builtin;

    if (!isRelative(specifier))
      throw new Error(`Plugin imports must be built or relative: ${specifier}`);

    return this.load(resolve(dirname(referencing.identifier), specifier));
  }
}

const isRelative = (specifier: string): boolean =>
  specifier.startsWith('./') || specifier.startsWith('../');

const kitSpecifier = '@argo/plugin-kit';

function builtModuleSource(source: string, path: string): string {
  if (!path.endsWith('.cjs')) return source;

  return `const module = { exports: {} }; const exports = module.exports;
    (function(module, exports) { ${source}\n })(module, exports);
    export const register = module.exports.register;`;
}
