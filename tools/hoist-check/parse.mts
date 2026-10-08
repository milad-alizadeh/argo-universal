import fs from 'node:fs';
import {
  parseSync,
  type StaticImport,
  type StaticExport,
  type StaticExportEntry,
} from 'oxc-parser';
import type { ImportBinding, ImportEdge, ParsedModule } from './context.mts';
import { expressionImports } from './expression-imports.mts';
import type { ResolveSpecifier, BoundResolver } from './resolve.mts';

function importBinding(entry: StaticImport['entries'][number]): ImportBinding {
  return {
    imported: entry.importName.name ?? '*',
    local: entry.localName.value,
  };
}

function staticImport(
  statement: StaticImport,
  resolve: BoundResolver,
): ImportEdge {
  return {
    specifier: statement.moduleRequest.value,
    target: resolve(statement.moduleRequest.value),
    names: statement.entries.map(importBinding),
    typeOnly:
      statement.entries.length > 0 &&
      statement.entries.every((entry): boolean => entry.isType),
    reExport: false,
  };
}

function exportBinding(entry: StaticExportEntry): ImportBinding {
  return {
    imported: entry.importName.name ?? '*',
    local: entry.exportName.name ?? '*',
  };
}

function reExportEdge(
  statement: StaticExport,
  specifier: string,
  resolve: BoundResolver,
): ImportEdge {
  return {
    specifier,
    target: resolve(specifier),
    names: statement.entries.map(exportBinding),
    typeOnly: statement.entries.every((entry): boolean => entry.isType),
    reExport: true,
  };
}

function staticExport(
  statement: StaticExport,
  resolve: BoundResolver,
): ImportEdge[] {
  const request = statement.entries[0]?.moduleRequest;
  return request ? [reExportEdge(statement, request.value, resolve)] : [];
}

function declaredName(entry: StaticExportEntry): string[] {
  return !entry.moduleRequest && entry.exportName.name
    ? [entry.exportName.name]
    : [];
}

function moduleImports(
  parsed: ReturnType<typeof parseSync>,
  resolve: BoundResolver,
): ImportEdge[] {
  return [
    ...parsed.module.staticImports.map((statement): ImportEdge =>
      staticImport(statement, resolve),
    ),
    ...parsed.module.staticExports.flatMap((statement): ImportEdge[] =>
      staticExport(statement, resolve),
    ),
    ...expressionImports(parsed.program, resolve),
  ];
}

export function parseModule(
  file: string,
  resolver: ResolveSpecifier,
): ParsedModule {
  const parsed = parseSync(file, fs.readFileSync(file, 'utf8'));
  const resolve = (specifier: string): string | undefined =>
    resolver(specifier, file);
  const imports = moduleImports(parsed, resolve);
  return {
    file,
    imports,
    reExports: imports.filter((edge): boolean => edge.reExport),
    declared: declaredExports(parsed),
  };
}

function declaredExports(parsed: ReturnType<typeof parseSync>): Set<string> {
  return new Set(
    parsed.module.staticExports.flatMap((statement): string[] =>
      statement.entries.flatMap(declaredName),
    ),
  );
}
