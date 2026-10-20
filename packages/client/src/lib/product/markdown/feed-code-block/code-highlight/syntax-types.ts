import type { Token } from 'prismjs';

/*
 * The colours the "Components / Code" master draws, one --color-syntax-* token each. Prism names
 * far more than six things; everything not mapped below stays foreground, punctuation and
 * operators included, so a block reads as code rather than as a paint chart.
 */
export const syntaxTypes = [
  'keyword',
  'function',
  'string',
  'constant',
  'type',
  'comment',
] as const;

export type SyntaxType = (typeof syntaxTypes)[number];

const byPrismType: Record<string, SyntaxType> = {
  'attr-name': 'function',
  'attr-value': 'string',
  'class-name': 'type',
  'doc-comment': 'comment',
  'maybe-class-name': 'type',
  'string-property': 'constant',
  'template-string': 'string',
  atrule: 'keyword',
  boolean: 'keyword',
  builtin: 'type',
  cdata: 'comment',
  char: 'string',
  comment: 'comment',
  constant: 'constant',
  function: 'function',
  important: 'keyword',
  interpolation: 'constant',
  keyword: 'keyword',
  namespace: 'type',
  // A literal is a constant written out, so it takes the constant colour rather than one of its own.
  number: 'constant',
  parameter: 'constant',
  prolog: 'comment',
  property: 'constant',
  regex: 'string',
  rule: 'keyword',
  selector: 'keyword',
  shebang: 'comment',
  string: 'string',
  symbol: 'constant',
  tag: 'keyword',
  url: 'string',
  variable: 'constant',
};

function aliasNames(alias: Token['alias']): string[] {
  if (alias === undefined) return [];

  return Array.isArray(alias) ? alias : [alias];
}

// A token's own name decides its colour; a grammar that names a token for its place rather than its
// kind (`punctuation` inside a tag) carries the kind as an alias instead, so aliases are the fallback.
export function syntaxTypeFor(token: Token): SyntaxType | undefined {
  for (const name of [token.type, ...aliasNames(token.alias)]) {
    const type = byPrismType[name];

    if (type !== undefined) return type;
  }

  return undefined;
}
