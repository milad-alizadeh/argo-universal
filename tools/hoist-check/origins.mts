import type {
  ImportBinding,
  ImportEdge,
  ModuleGraph,
  ParsedModule,
} from './context.mts';

export type SymbolOrigin = { file: string; name: string };
type OriginFinder = (
  file: string,
  name: string,
  seen?: Set<string>,
) => SymbolOrigin | undefined;
type FindOrigin = (file: string, name: string) => SymbolOrigin | undefined;
type ExportNameFinder = (file: string) => string[];

function reExportOrigin(
  edge: ImportEdge,
  name: string,
  find: FindOrigin,
): SymbolOrigin | undefined {
  const target = edge.target;
  if (!target) return;
  return edge.names
    .map((entry): SymbolOrigin | undefined =>
      namedOrigin({ target, entry, name }, find),
    )
    .find(Boolean);
}

function namedOrigin(
  {
    target,
    entry,
    name,
  }: { target: string; entry: ImportBinding; name: string },
  find: FindOrigin,
): SymbolOrigin | undefined {
  if (entry.local === '*') return find(target, name);
  if (entry.local !== name) return;
  return importedOrigin(target, entry.imported, find);
}

function importedOrigin(
  target: string,
  name: string,
  find: FindOrigin,
): SymbolOrigin | undefined {
  return name === '*'
    ? { file: target, name }
    : (find(target, name) ?? { file: target, name });
}

function exportOrigin(
  module: ParsedModule | undefined,
  name: string,
  find: FindOrigin,
): SymbolOrigin | undefined {
  if (!module) return;
  if (module.declared.has(name)) return { file: module.file, name };
  return module.reExports
    .map((edge): SymbolOrigin | undefined => reExportOrigin(edge, name, find))
    .find(Boolean);
}

type OriginQuery = SymbolOrigin & { seen: Set<string> };

function findOrigin(
  modules: ModuleGraph,
  query: OriginQuery,
): SymbolOrigin | undefined {
  const { file, name, seen } = query;
  const key = `${file}#${name}`;
  if (seen.has(key)) return;
  seen.add(key);
  return exportOrigin(
    modules.get(file),
    name,
    (target, symbol): SymbolOrigin | undefined =>
      findOrigin(modules, { file: target, name: symbol, seen }),
  );
}

export function createOriginFinder(modules: ModuleGraph): OriginFinder {
  return (file, name, seen = new Set<string>()): SymbolOrigin | undefined =>
    findOrigin(modules, { file, name, seen });
}

export function createExportNameFinder(modules: ModuleGraph): ExportNameFinder {
  return (file): string[] => exportedNames(modules, file, new Set());
}

function exportedNames(
  modules: ModuleGraph,
  file: string,
  seen: Set<string>,
): string[] {
  if (seen.has(file)) return [];
  seen.add(file);
  const module = modules.get(file);
  if (!module) return [];
  return exposedNames(module, (target): string[] =>
    exportedNames(modules, target, seen),
  );
}

function reExportNames(edge: ImportEdge, find: ExportNameFinder): string[] {
  const target = edge.target;
  if (!target) return [];
  return edge.names.flatMap((entry): string[] =>
    entry.local === '*' ? find(target) : [entry.local],
  );
}

function exposedNames(module: ParsedModule, find: ExportNameFinder): string[] {
  return [
    ...module.declared,
    ...module.reExports.flatMap((edge): string[] => reExportNames(edge, find)),
  ];
}
