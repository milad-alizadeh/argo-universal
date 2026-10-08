import { createExportNameFinder, createOriginFinder } from './origins.mjs';
import { isTestAsset, relative } from './scan.mjs';

const emptyConsumers = () => ({ production: new Set(), test: new Set() });
function add(map, key, consumer) {
  if (!map.has(key)) map.set(key, emptyConsumers());
  map.get(key)[isTestAsset(consumer) ? 'test' : 'production'].add(consumer);
}

function addSymbol(context, entry, edge) {
  if (entry.imported === '*') {
    context
      .exportedNames(edge.target)
      .map((name) => addSymbol(context, { imported: name }, edge));
    return;
  }
  const origin = context.originOf(edge.target, entry.imported);
  if (!origin) return;
  addOrigin(context, origin);
}

function addEdge(context, edge) {
  if (!edge.target) return;
  addTarget(context, edge);
}

function addTarget(context, edge) {
  if (edge.target === context.file) return;
  if (edge.reExport) {
    context.barrelExposed.add(edge.target);
    return;
  }
  add(context.moduleConsumers, edge.target, context.consumer);
  edge.names.map((entry) => addSymbol(context, entry, edge));
}

export function countConsumers(root, modules) {
  const counts = emptyCounts();
  const originOf = createOriginFinder(modules);
  const context = {
    ...counts,
    originOf,
    root,
    exportedNames: createExportNameFinder(modules),
  };
  [...modules.values()].map((module) => addModule(context, module));
  return counts;
}

export function consumersOf(counts, file) {
  const base = file.replace(/\.(?:native|web|ios|android)(\.[^.]+)$/, '$1');
  return (
    counts.moduleConsumers.get(file) ??
    counts.moduleConsumers.get(base) ??
    emptyConsumers()
  );
}

export function exportConsumersOf(counts, file, name) {
  return counts.exportConsumers.get(`${file}#${name}`) ?? emptyConsumers();
}

function addOrigin(context, origin) {
  if (origin.file === context.file) return;
  add(context.moduleConsumers, origin.file, context.consumer);
  if (origin.name !== '*')
    add(
      context.exportConsumers,
      `${origin.file}#${origin.name}`,
      context.consumer,
    );
}

function addModule(context, module) {
  const consumer = relative(context.root, module.file);
  const moduleContext = { ...context, file: module.file, consumer };
  module.imports.map((edge) => addEdge(moduleContext, edge));
}

function emptyCounts() {
  return {
    moduleConsumers: new Map(),
    exportConsumers: new Map(),
    barrelExposed: new Set(),
  };
}
