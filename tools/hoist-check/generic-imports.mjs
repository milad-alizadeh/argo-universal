import fs from 'node:fs';
import path from 'node:path';
import { relative } from './scan.mjs';
import { tierOf } from './tiers.mjs';

function upwardEdge(context, file, edge) {
  if (!edge.target) return [];
  const target = relative(context.root, edge.target);
  const tier = tierOf(target);
  if (!['product', 'local'].includes(tier.tier)) return [];
  return [
    `! ${file} -> ${edge.specifier} (${target}, ${tier.label}${typeOnlyLabel(edge)})`,
  ];
}

export function genericImportReport(context) {
  const lines = context.production.flatMap((module) => {
    const file = relative(context.root, module.file);
    if (tierOf(file).tier !== 'generic') return [];
    return module.imports.flatMap((edge) => upwardEdge(context, file, edge));
  });
  return [
    '\n## E. Generic tier importing product or local code',
    ...lines,
    `findings: ${lines.length}`,
  ];
}

function glossaryTerms(root) {
  const file = path.join(root, 'GLOSSARY.md');
  if (!fs.existsSync(file)) return [];
  return [...fs.readFileSync(file, 'utf8').matchAll(/^\*\*([^*]+)\*\*:/gm)].map(
    (match) => match[1].trim().toLowerCase().split(/\s+/),
  );
}

function wordsOf(name) {
  return name
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[\s_$]+/)
    .filter(Boolean)
    .map((word) => word.replace(/(?:es|s)$/, ''));
}

function namedTerms(name, terms) {
  const words = wordsOf(name);
  return terms.filter((term) =>
    words.some((_, start) =>
      term.every(
        (part, offset) =>
          words[start + offset] === part.replace(/(?:es|s)$/, ''),
      ),
    ),
  );
}

function glossaryExports(context, module, terms) {
  const file = relative(context.root, module.file);
  if (tierOf(file).tier !== 'generic') return [];
  return [...module.declared].flatMap((name) => {
    const matched = namedTerms(name, terms);
    return matched.length
      ? [
          `! ${file}: ${name} names ${matched.map((term) => term.join(' ')).join(', ')}`,
        ]
      : [];
  });
}

export function glossaryReport(context) {
  const terms = glossaryTerms(context.root);
  const lines = context.production.flatMap((module) =>
    glossaryExports(context, module, terms),
  );
  return [
    '\n## F. Glossary terms in generic-tier export names',
    'Shell and Turn have UI homonyms (the app frame, a rotation), so a person checks those hits.',
    ...lines,
    `findings: ${lines.length} (terms: ${terms.length})`,
  ];
}

function typeOnlyLabel(edge) {
  return edge.typeOnly ? ', type-only' : '';
}
