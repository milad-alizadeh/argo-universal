import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { SourceTextModule, SyntheticModule, type Module } from 'node:vm';
import { requirePluginFile } from '../access/plugin-files.ts';
import { bundleKit } from '../kit/bundle.ts';
import type { PluginEntry } from '../protocol/runtime.ts';
import { type ArgoBridge } from './argo.ts';
import type { PluginRealmExports } from './plugin-api.ts';
import {
  createPluginRealm,
  type PluginClock,
  type PluginRealm,
} from './realm.ts';

// `executing` runs once Argo's own loading is done and Plugin code is about to run, where the host's answer deadline starts.
type PluginStart = { clock: PluginClock | undefined; executing: () => void };

/*
 * The context deliberately has no Node globals; the frozen `argo` object, built inside the context, is its only way out. This is a
 * first-party execution boundary, not a security boundary for untrusted code.
 */
export async function registerPlugin(
  entry: PluginEntry,
  bridge: ArgoBridge,
  { clock, executing }: PluginStart,
): Promise<PluginInboxes> {
  const { context, inboxes, modules, validateBackground } = createPluginRealm(
    bridge,
    await bundleKit(),
    clock,
  );

  executing();
  await bootstrap(context, new PluginModules(entry, context, modules));

  validatePaths(entry, validateBackground);

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
export type PluginInboxes = PluginRealmExports['inboxes'];

type KitModules = PluginRealmExports['modules'];

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
    if (specifier === kitSpecifier) return this.synthetic(this.kit.exports);

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

function validatePaths(
  entry: PluginEntry,
  validate: PluginRealmExports['validateBackground'],
): void {
  if (entry.backgroundPath !== undefined) validate(entry.backgroundPath);

  for (const path of accountPaths(entry)) validate(path, 'Account');
}

const accountPaths = (entry: PluginEntry): string[] => entry.accountPaths ?? [];
