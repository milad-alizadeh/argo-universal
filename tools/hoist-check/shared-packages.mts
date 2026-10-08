import path from 'node:path';
import { consumersOf, type Consumers } from './consumers.mts';
import {
  modulesMatching,
  type ParsedModule,
  type ReportContext,
} from './context.mts';
import { packageOfFile, type WorkspacePackage } from './packages.mts';
import { relative } from './scan.mts';
import { hoistingConsumerThreshold, shortList, tierOf } from './tiers.mts';

function outsideConsumers(
  context: ReportContext,
  module: ParsedModule,
  owner: WorkspacePackage,
): Set<string> {
  return new Set(
    [...consumersOf(context.counts, module.file).production].filter(
      (consumer): boolean =>
        !path
          .join(context.root, consumer)
          .startsWith(owner.directory + path.sep),
    ),
  );
}

function genericLines(context: ReportContext, module: ParsedModule): string[] {
  const owner = packageOfFile(context.packages, module.file);
  if (!owner) return [];
  const consumers = consumersOf(context.counts, module.file);
  const outside = outsideConsumers(context, module, owner);
  if (!reportGeneric(outside, consumers)) return [];
  return [
    `${outsideMarker(outside)} ${relative(context.root, module.file)}: ${outside.size} production outside ${owner.name} (${shortList(outside)}), ${consumers.test.size} test`,
  ];
}

export function genericPackagesReport(context: ReportContext): string[] {
  const generic = context.production.filter(
    (module): boolean =>
      tierOf(relative(context.root, module.file)).label === 'generic package',
  );
  return [
    '\n## B. Generic packages (machine-log, uniwind, tooling/*) and vendored primitives',
    ...generic.flatMap((module): string[] => genericLines(context, module)),
    primitivesLine(context),
  ];
}

function productLine(context: ReportContext, name: string): string[] {
  const owner = context.packages.get(name);
  if (!owner) return [];
  const modules = context.production.filter((module): boolean =>
    module.file.startsWith(owner.directory + path.sep),
  );
  const counts = modules.map(
    (module): number => outsideConsumers(context, module, owner).size,
  );
  return [
    `  ${name}: ${modules.length} modules; reached from another package by 1 file: ${counts.filter((count): boolean => count === 1).length}, by 2: ${counts.filter((count): boolean => count === 2).length}, by 3+: ${counts.filter((count): boolean => count >= hoistingConsumerThreshold).length}`,
  ];
}

export function productPackagesReport(context: ReportContext): string[] {
  return [
    '\n## D. Product packages: modules by how many files in other packages import them (counts only)',
    ...['@repo/contracts', '@repo/db', '@repo/api', '@repo/agents'].flatMap(
      (name): string[] => productLine(context, name),
    ),
  ];
}

function reportGeneric(outside: Set<string>, consumers: Consumers): boolean {
  if (outside.size >= hoistingConsumerThreshold) return false;
  return outside.size > 0 || consumers.production.size === 0;
}

function outsideMarker(outside: Set<string>): string {
  return outside.size > 0 ? '!' : ' ';
}

function primitivesLine(context: ReportContext): string {
  const primitives = modulesMatching(
    context,
    /^packages\/client\/src\/primitives\//,
  );
  const counts = [0, 1, 2].map(
    (count): number =>
      primitives.filter(
        (module): boolean =>
          consumersOf(context.counts, module.file).production.size === count,
      ).length,
  );
  return `  primitives: ${primitives.length} modules; 0 consumers: ${counts[0]}, 1: ${counts[1]}, 2: ${counts[2]} (informational)`;
}
