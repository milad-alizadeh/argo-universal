import type {
  ImportBinding,
  ImportEdge,
  ModuleGraph,
  ParsedModule,
} from './context.mts';
import {
  createExportNameFinder,
  createOriginFinder,
  type SymbolOrigin,
} from './origins.mts';
import { isTestAsset, relative } from './scan.mts';

export type Consumers = { production: Set<string>; test: Set<string> };
type ConsumerMap = Map<string, Consumers>;
type ConsumerCounts = {
  moduleConsumers: ConsumerMap;
  exportConsumers: ConsumerMap;
  barrelExposed: Set<string>;
};
type CountContext = ConsumerCounts & {
  root: string;
  originOf: ReturnType<typeof createOriginFinder>;
  exportedNames: ReturnType<typeof createExportNameFinder>;
};
type ModuleCountContext = CountContext & { file: string; consumer: string };

const emptyConsumers = (): Consumers => ({
  production: new Set(),
  test: new Set(),
});
function add(map: ConsumerMap, key: string, consumer: string): void {
  const consumers = map.get(key) ?? emptyConsumers();
  consumers[isTestAsset(consumer) ? 'test' : 'production'].add(consumer);
  map.set(key, consumers);
}

function addSymbol(
  context: ModuleCountContext,
  entry: Pick<ImportBinding, 'imported'>,
  edge: ImportEdge & { target: string },
): void {
  if (entry.imported === '*') {
    context
      .exportedNames(edge.target)
      .map((name): void => addSymbol(context, { imported: name }, edge));
    return;
  }
  const origin = context.originOf(edge.target, entry.imported);
  if (!origin) return;
  addOrigin(context, origin);
}

function addEdge(context: ModuleCountContext, edge: ImportEdge): void {
  if (!edge.target) return;
  addTarget(context, { ...edge, target: edge.target });
}

function addTarget(
  context: ModuleCountContext,
  edge: ImportEdge & { target: string },
): void {
  if (edge.target === context.file) return;
  if (edge.reExport) {
    context.barrelExposed.add(edge.target);
    return;
  }
  add(context.moduleConsumers, edge.target, context.consumer);
  edge.names.map((entry): void => addSymbol(context, entry, edge));
}

export function countConsumers(
  root: string,
  modules: ModuleGraph,
): ConsumerCounts {
  const counts = emptyCounts();
  const originOf = createOriginFinder(modules);
  const context = {
    ...counts,
    originOf,
    root,
    exportedNames: createExportNameFinder(modules),
  };
  [...modules.values()].map((module): void => addModule(context, module));
  return counts;
}

export function consumersOf(
  counts: Pick<ConsumerCounts, 'moduleConsumers'>,
  file: string,
): Consumers {
  const base = file.replace(/\.(?:native|web|ios|android)(\.[^.]+)$/, '$1');
  return (
    counts.moduleConsumers.get(file) ??
    counts.moduleConsumers.get(base) ??
    emptyConsumers()
  );
}

export function exportConsumersOf(
  counts: Pick<ConsumerCounts, 'exportConsumers'>,
  file: string,
  name: string,
): Consumers {
  return counts.exportConsumers.get(`${file}#${name}`) ?? emptyConsumers();
}

function addOrigin(context: ModuleCountContext, origin: SymbolOrigin): void {
  if (origin.file === context.file) return;
  add(context.moduleConsumers, origin.file, context.consumer);
  if (origin.name !== '*')
    add(
      context.exportConsumers,
      `${origin.file}#${origin.name}`,
      context.consumer,
    );
}

function addModule(context: CountContext, module: ParsedModule): void {
  const consumer = relative(context.root, module.file);
  const moduleContext = { ...context, file: module.file, consumer };
  module.imports.map((edge): void => addEdge(moduleContext, edge));
}

function emptyCounts(): ConsumerCounts {
  return {
    moduleConsumers: new Map(),
    exportConsumers: new Map(),
    barrelExposed: new Set(),
  };
}
