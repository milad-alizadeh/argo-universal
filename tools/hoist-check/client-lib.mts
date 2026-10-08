import {
  consumersOf,
  exportConsumersOf,
  type Consumers,
} from './consumers.mts';
import {
  modulesMatching,
  type ParsedModule,
  type ReportContext,
} from './context.mts';
import { relative } from './scan.mts';
import { shortList, tierOf, verdict } from './tiers.mts';

function exportLines(context: ReportContext, module: ParsedModule): string[] {
  return [...module.declared]
    .sort((a, b): number => a.localeCompare(b))
    .flatMap((name): string[] => exportLine(context, module.file, name));
}

function exportLine(
  context: ReportContext,
  file: string,
  name: string,
): string[] {
  const consumers = exportConsumersOf(context.counts, file, name).production;
  return consumers.size === 1
    ? [`    export ${name}: 1 production consumer (${shortList(consumers)})`]
    : [];
}

function moduleLines(context: ReportContext, module: ParsedModule): string[] {
  const file = relative(context.root, module.file);
  if (file.endsWith('.d.ts'))
    return [
      `  ${file}: type augmentation, applies without an importer; skipped`,
    ];
  const consumers = consumersOf(context.counts, module.file);
  const count = consumers.production.size;
  const line = consumerLine(context, module.file, consumers);
  return [line, ...(count >= 2 ? exportLines(context, module) : [])];
}

export function clientLibReport(context: ReportContext): string[] {
  const modules = modulesMatching(context, /^packages\/client\/src\/lib\//);
  const findings = modules
    .filter((module): boolean => !module.file.endsWith('.d.ts'))
    .filter(
      (module): boolean =>
        consumersOf(context.counts, module.file).production.size < 3,
    ).length;
  return [
    '\n## A. Client lib modules (generic tier)',
    ...modules.flatMap((module): string[] => moduleLines(context, module)),
    `findings: ${findings} of ${modules.length} lib modules have fewer than 3 production consumers`,
  ];
}

function consumerLine(
  context: ReportContext,
  moduleFile: string,
  consumers: Consumers,
): string {
  const file = relative(context.root, moduleFile);
  const count = consumers.production.size;
  const barrel = context.counts.barrelExposed.has(moduleFile)
    ? '; re-exported by a barrel'
    : '';
  return `${count < 3 ? '!' : ' '} ${file} [${tierOf(file).tier}]: ${count} production (${shortList(consumers.production)}), ${consumers.test.size} test; ${verdict(count)}${barrel}`;
}
