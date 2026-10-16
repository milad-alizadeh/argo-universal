import { readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { createContext, SourceTextModule, type Module } from 'node:vm';
import type { PluginEntry } from './runtime-protocol.ts';

/*
 * The context deliberately has no Node globals or host functions. This is a
 * first-party execution boundary, not a security boundary for untrusted code.
 */
export async function registerPlugin(entry: PluginEntry): Promise<void> {
  const context = createContext(undefined, {
    codeGeneration: { strings: false, wasm: false },
  });

  const modules = new PluginModules(entry, context);

  const bootstrap = registrationModule(context);

  await bootstrap.link((specifier, referencing) =>
    referencing === bootstrap
      ? modules.entryModule()
      : modules.link(specifier, referencing),
  );
  await bootstrap.evaluate();
}

const registrationModule = (
  context: ReturnType<typeof createContext>,
): SourceTextModule =>
  new SourceTextModule(
    'import { register } from "./entry"; await register(Object.freeze({}));',
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
    const target = await realpath(path);
    const root = await realpath(this.entry.directory);
    requireInside(root, target);

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

function requireInside(root: string, target: string): void {
  const path = relative(root, target);

  if (isAbsolute(path) || path.split(sep).at(0) === '..')
    throw new Error('Plugin entry imports must stay in its folder');
}
