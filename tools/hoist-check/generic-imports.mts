import fs from 'node:fs';
import path from 'node:path';
import type { ImportEdge, ReportContext, ParsedModule } from './context.mts';
import { relative } from './scan.mts';
import { tierOf } from './tiers.mts';

function upwardEdge(
  context: ReportContext,
  file: string,
  edge: ImportEdge,
): string[] {
  if (!edge.target) return [];
  const target = relative(context.root, edge.target);
  const tier = tierOf(target);
  if (!['product', 'local'].includes(tier.tier)) return [];
  return [
    `! ${file} -> ${edge.specifier} (${target}, ${tier.label}${typeOnlyLabel(edge)})`,
  ];
}

export function genericImportReport(context: ReportContext): string[] {
  const lines = context.production.flatMap((module): string[] => {
    const file = relative(context.root, module.file);
    if (tierOf(file).tier !== 'generic') return [];
    return module.imports.flatMap((edge): string[] =>
      upwardEdge(context, file, edge),
    );
  });
  return [
    '\n## E. Generic tier importing product or local code',
    ...lines,
    `findings: ${lines.length}`,
  ];
}

function glossaryTerms(root: string): string[][] {
  const file = path.join(root, 'GLOSSARY.md');
  if (!fs.existsSync(file)) return [];
  return [...fs.readFileSync(file, 'utf8').matchAll(/^\*\*([^*]+)\*\*:/gm)].map(
    (match): string[] => (match[1] ?? '').trim().toLowerCase().split(/\s+/),
  );
}

function wordsOf(name: string): string[] {
  return name
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[\s_$]+/)
    .filter(Boolean)
    .map((word): string => word.replace(/(?:es|s)$/, ''));
}

function namedTerms(name: string, terms: string[][]): string[][] {
  const words = wordsOf(name);
  return terms.filter((term): boolean =>
    words.some((_, start): boolean =>
      term.every(
        (part, offset): boolean =>
          words[start + offset] === part.replace(/(?:es|s)$/, ''),
      ),
    ),
  );
}

function glossaryName(
  file: string,
  name: string,
  matched: string[][],
): string[] {
  return matched.length
    ? [
        `! ${file}: ${name} names ${matched.map((term): string => term.join(' ')).join(', ')}`,
      ]
    : [];
}

function glossaryExports(
  context: ReportContext,
  module: ParsedModule,
  terms: string[][],
): string[] {
  const file = relative(context.root, module.file);
  if (tierOf(file).tier !== 'generic') return [];
  return [...module.declared].flatMap((name): string[] =>
    glossaryName(file, name, namedTerms(name, terms)),
  );
}

export function glossaryReport(context: ReportContext): string[] {
  const terms = glossaryTerms(context.root);
  const lines = context.production.flatMap((module): string[] =>
    glossaryExports(context, module, terms),
  );
  return [
    '\n## F. Glossary terms in generic-tier export names',
    'Shell and Turn have UI homonyms (the app frame, a rotation), so a person checks those hits.',
    ...lines,
    `findings: ${lines.length} (terms: ${terms.length})`,
  ];
}

function typeOnlyLabel(edge: ImportEdge): string {
  return edge.typeOnly ? ', type-only' : '';
}
