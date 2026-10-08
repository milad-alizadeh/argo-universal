import { consumersOf, exportConsumersOf } from './consumers.mjs';
import { modulesMatching } from './context.mjs';
import { relative } from './scan.mjs';
import { shortList, tierOf, verdict } from './tiers.mjs';

function exportLines(context, module) {
  return [...module.declared]
    .sort((a, b) => a.localeCompare(b))
    .flatMap((name) => exportLine(context, module.file, name));
}

function exportLine(context, file, name) {
  const consumers = exportConsumersOf(context.counts, file, name).production;
  return consumers.size === 1
    ? [`    export ${name}: 1 production consumer (${shortList(consumers)})`]
    : [];
}

function moduleLines(context, module) {
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

export function clientLibReport(context) {
  const modules = modulesMatching(context, /^packages\/client\/src\/lib\//);
  const findings = modules
    .filter((module) => !module.file.endsWith('.d.ts'))
    .filter(
      (module) => consumersOf(context.counts, module.file).production.size < 3,
    ).length;
  return [
    '\n## A. Client lib modules (generic tier)',
    ...modules.flatMap((module) => moduleLines(context, module)),
    `findings: ${findings} of ${modules.length} lib modules have fewer than 3 production consumers`,
  ];
}

function consumerLine(context, moduleFile, consumers) {
  const file = relative(context.root, moduleFile);
  const count = consumers.production.size;
  const barrel = context.counts.barrelExposed.has(moduleFile)
    ? '; re-exported by a barrel'
    : '';
  return `${count < 3 ? '!' : ' '} ${file} [${tierOf(file).tier}]: ${count} production (${shortList(consumers.production)}), ${consumers.test.size} test; ${verdict(count)}${barrel}`;
}
