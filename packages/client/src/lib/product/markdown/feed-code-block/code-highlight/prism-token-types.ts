import type { Token } from 'prismjs';
import type { SyntaxType } from '../../../../generic/code-text/syntax-run';

/*
 * Prism names far more than six things; everything left out here stays foreground, punctuation and
 * operators included, so a block reads as code rather than as a paint chart.
 */
const byPrismType = new Map<string, SyntaxType>([
  ['atrule', 'keyword'],
  ['attr-name', 'function'],
  ['attr-value', 'string'],
  ['boolean', 'keyword'],
  ['builtin', 'type'],
  ['cdata', 'comment'],
  ['char', 'string'],
  ['class-name', 'type'],
  ['comment', 'comment'],
  ['constant', 'constant'],
  ['doc-comment', 'comment'],
  ['function', 'function'],
  ['important', 'keyword'],
  ['interpolation', 'constant'],
  ['keyword', 'keyword'],
  ['maybe-class-name', 'type'],
  ['namespace', 'type'],
  // A literal is a constant written out, so it takes the constant colour rather than one of its own.
  ['number', 'constant'],
  ['parameter', 'constant'],
  ['prolog', 'comment'],
  ['property', 'constant'],
  ['regex', 'string'],
  ['rule', 'keyword'],
  ['selector', 'keyword'],
  ['shebang', 'comment'],
  ['string', 'string'],
  ['string-property', 'constant'],
  ['symbol', 'constant'],
  ['tag', 'keyword'],
  ['template-string', 'string'],
  ['url', 'string'],
  ['variable', 'constant'],
]);

function aliasNames(alias: Token['alias']): string[] {
  if (alias === undefined) return [];

  return Array.isArray(alias) ? alias : [alias];
}

/*
 * A token's own name decides its colour; a grammar that names a token for its place rather than its
 * kind (`punctuation` inside a tag) carries the kind as an alias instead, so aliases are the
 * fallback.
 */
export function syntaxTypeFor(token: Token): SyntaxType | undefined {
  for (const name of [token.type, ...aliasNames(token.alias)]) {
    const type = byPrismType.get(name);

    if (type !== undefined) return type;
  }

  return undefined;
}
