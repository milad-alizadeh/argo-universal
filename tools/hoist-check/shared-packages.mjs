import path from 'node:path';
import { consumersOf } from './consumers.mjs';
import { modulesMatching } from './context.mjs';
import { packageOfFile } from './packages.mjs';
import { relative } from './scan.mjs';
import { shortList, tierOf } from './tiers.mjs';

function outsideConsumers(context, module, owner) {
  return new Set(
    [...consumersOf(context.counts, module.file).production].filter(
      (consumer) =>
        !path
          .join(context.root, consumer)
          .startsWith(owner.directory + path.sep),
    ),
  );
}

function genericLines(context, module) {
  const owner = packageOfFile(context.packages, module.file);
  if (!owner) return [];
  const consumers = consumersOf(context.counts, module.file);
  const outside = outsideConsumers(context, module, owner);
  if (!reportGeneric(outside, consumers)) return [];
  return [
    `${outsideMarker(outside)} ${relative(context.root, module.file)}: ${outside.size} production outside ${owner.manifest.name} (${shortList(outside)}), ${consumers.test.size} test`,
  ];
}

export function genericPackagesReport(context) {
  const generic = context.production.filter(
    (module) =>
      tierOf(relative(context.root, module.file)).label === 'generic package',
  );
  return [
    '\n## B. Generic packages (machine-log, uniwind, tooling/*) and vendored primitives',
    ...generic.flatMap((module) => genericLines(context, module)),
    primitivesLine(context),
  ];
}

function productLine(context, name) {
  const owner = context.packages.get(name);
  if (!owner) return [];
  const modules = context.production.filter((module) =>
    module.file.startsWith(owner.directory + path.sep),
  );
  const counts = modules.map(
    (module) => outsideConsumers(context, module, owner).size,
  );
  return [
    `  ${name}: ${modules.length} modules; reached from another package by 1 file: ${counts.filter((count) => count === 1).length}, by 2: ${counts.filter((count) => count === 2).length}, by 3+: ${counts.filter((count) => count >= 3).length}`,
  ];
}

export function productPackagesReport(context) {
  return [
    '\n## D. Product packages: modules by how many files in other packages import them (counts only)',
    ...['@repo/contracts', '@repo/db', '@repo/api', '@repo/agents'].flatMap(
      (name) => productLine(context, name),
    ),
  ];
}

function reportGeneric(outside, consumers) {
  if (outside.size >= 3) return false;
  return outside.size > 0 || consumers.production.size === 0;
}

function outsideMarker(outside) {
  return outside.size > 0 ? '!' : ' ';
}

function primitivesLine(context) {
  const primitives = modulesMatching(
    context,
    /^packages\/client\/src\/primitives\//,
  );
  const counts = [0, 1, 2].map(
    (count) =>
      primitives.filter(
        (module) =>
          consumersOf(context.counts, module.file).production.size === count,
      ).length,
  );
  return `  primitives: ${primitives.length} modules; 0 consumers: ${counts[0]}, 1: ${counts[1]}, 2: ${counts[2]} (informational)`;
}
