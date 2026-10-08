import fs from 'node:fs';
import { countConsumers } from './consumers.mts';
import { readPackages } from './packages.mts';
import { parseModule } from './parse.mts';
import { createResolver } from './resolve.mts';
import { isTestAsset, relative, walk } from './scan.mts';

export type ImportBinding = { imported: string; local: string };
export type ImportEdge = {
  specifier: string;
  target: string | undefined;
  names: ImportBinding[];
  typeOnly: boolean;
  reExport: boolean;
};
export type ParsedModule = {
  file: string;
  imports: ImportEdge[];
  reExports: ImportEdge[];
  declared: Set<string>;
};
export type ModuleGraph = Map<string, ParsedModule>;
export type ReportContext = {
  root: string;
  packages: ReturnType<typeof readPackages>;
  modules: ModuleGraph;
  production: ParsedModule[];
  counts: ReturnType<typeof countConsumers>;
};

export function reportContext(directory: string): ReportContext {
  const root = fs.realpathSync(directory);
  const packages = readPackages(root);
  const modules = sourceModules(root, createResolver(packages));
  const production = [...modules.values()].filter(
    (module): boolean => !isTestAsset(relative(root, module.file)),
  );
  return {
    root,
    packages,
    modules,
    production,
    counts: countConsumers(root, modules),
  };
}

export function modulesMatching(
  context: Pick<ReportContext, 'root' | 'production'>,
  pattern: RegExp,
): ParsedModule[] {
  return context.production
    .filter((module): boolean =>
      pattern.test(relative(context.root, module.file)),
    )
    .sort((a, b): number => a.file.localeCompare(b.file));
}

function sourceModules(
  root: string,
  resolve: ReturnType<typeof createResolver>,
): ModuleGraph {
  return new Map(
    walk(root).map((file): [string, ParsedModule] => [
      file,
      parseModule(file, resolve),
    ]),
  );
}
