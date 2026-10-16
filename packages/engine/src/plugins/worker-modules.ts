import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  createContext,
  runInContext,
  SourceTextModule,
  type Module,
} from 'node:vm';
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
): Promise<void> {
  const context = pluginContext(bridge);
  const modules = new PluginModules(entry, context);

  const bootstrap = registrationModule(context);

  await bootstrap.link((specifier, referencing) =>
    referencing === bootstrap
      ? modules.entryModule()
      : modules.link(specifier, referencing),
  );
  await bootstrap.evaluate();
}

// `argoSource` builds the frozen `argo` inside the context and removes the bridge from it.
function pluginContext(bridge: ArgoBridge): ReturnType<typeof createContext> {
  const context = createContext(
    { __argoBridge: bridge },
    { codeGeneration: { strings: false, wasm: false } },
  );

  runInContext(`globalThis.argo = ${argoSource}`, context);

  return context;
}

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

  constructor(entry: PluginEntry, context: ReturnType<typeof createContext>) {
    this.entry = entry;
    this.context = context;
  }

  entryModule(): Promise<SourceTextModule> {
    return this.load(resolve(this.entry.directory, this.entry.main));
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
  ): Promise<SourceTextModule> {
    if (!specifier.startsWith('./') && !specifier.startsWith('../'))
      throw new Error(`Plugin imports must be built or relative: ${specifier}`);

    return this.load(resolve(dirname(referencing.identifier), specifier));
  }
}

function builtModuleSource(source: string, path: string): string {
  if (!path.endsWith('.cjs')) return source;

  return `const module = { exports: {} }; const exports = module.exports;
    (function(module, exports) { ${source}\n })(module, exports);
    export const register = module.exports.register;`;
}
