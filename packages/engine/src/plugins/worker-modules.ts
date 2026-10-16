import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  createContext,
  runInContext,
  SourceTextModule,
  SyntheticModule,
  type Module,
} from 'node:vm';
import { bundleKit } from './kit/bundle.ts';
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
): Promise<PluginInbox> {
  const { context, inbox, kit } = pluginContext(bridge, await bundleKit());
  const modules = new PluginModules(entry, context, kit);

  const bootstrap = registrationModule(context);

  await bootstrap.link((specifier, referencing) =>
    referencing === bootstrap
      ? modules.entryModule()
      : modules.link(specifier, referencing),
  );
  await bootstrap.evaluate();

  return inbox;
}

// How the worker reaches a Plugin's pages: a JSON string in, nothing out.
export type PluginInbox = (json: string) => void;

interface KitModules {
  kit: Record<string, unknown>;
  jsxRuntime: Record<string, unknown>;
}

interface PluginContext {
  context: ReturnType<typeof createContext>;
  inbox: PluginInbox;
  kit: KitModules;
}

// The kit runs first, with microtask timers for its scheduler; `argoSource` then builds the frozen `argo` from it and removes the bridge.
function pluginContext(bridge: ArgoBridge, kitSource: string): PluginContext {
  const context = createContext(
    { __argoBridge: bridge },
    { codeGeneration: { strings: false, wasm: false } },
  );

  runInContext(kitPrelude, context);
  runInContext(kitSource, context);
  runInContext(`globalThis.argo = ${argoSource}`, context);

  const inbox = runInContext('globalThis.__argoInbox', context) as PluginInbox;
  const exported = runInContext(
    'globalThis.__argoKitExports',
    context,
  ) as { exports: Record<string, unknown>; jsxRuntime: Record<string, unknown> };
  runInContext(
    'delete globalThis.__argoInbox; delete globalThis.__argoKitExports',
    context,
  );

  return {
    context,
    inbox,
    kit: { kit: exported.exports, jsxRuntime: exported.jsxRuntime },
  };
}

const kitPrelude = `
  globalThis.setTimeout = (callback) => { Promise.resolve().then(callback); return 0; };
  globalThis.clearTimeout = () => {};
  globalThis.console = { log() {}, info() {}, warn() {}, error() {}, debug() {} };
`;

const registrationModule = (
  context: ReturnType<typeof createContext>,
): SourceTextModule =>
  new SourceTextModule(
    'import { register } from "./entry"; await register(argo);',
    { context },
  );

class PluginModules {
  private readonly modules = new Map<string, Promise<SourceTextModule>>();

  private readonly entry: PluginEntry;
  private readonly context: ReturnType<typeof createContext>;
  private readonly kit: KitModules;

  constructor(
    entry: PluginEntry,
    context: ReturnType<typeof createContext>,
    kit: KitModules,
  ) {
    this.entry = entry;
    this.context = context;
    this.kit = kit;
  }

  entryModule(): Promise<SourceTextModule> {
    return this.load(resolve(this.entry.directory, this.entry.main));
  }

  private synthetic(values: Record<string, unknown>): SyntheticModule {
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

  async link(
    specifier: string,
    referencing: Module,
  ): Promise<Module> {
    if (specifier === kitSpecifier) return this.synthetic(this.kit.kit);

    if (specifier === `${kitSpecifier}/jsx-runtime`)
      return this.synthetic(this.kit.jsxRuntime);

    if (!specifier.startsWith('./') && !specifier.startsWith('../'))
      throw new Error(`Plugin imports must be built or relative: ${specifier}`);

    return this.load(resolve(dirname(referencing.identifier), specifier));
  }
}

const kitSpecifier = '@argo/plugin-kit';

function builtModuleSource(source: string, path: string): string {
  if (!path.endsWith('.cjs')) return source;

  return `const module = { exports: {} }; const exports = module.exports;
    (function(module, exports) { ${source}\n })(module, exports);
    export const register = module.exports.register;`;
}
